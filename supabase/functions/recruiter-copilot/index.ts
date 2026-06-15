// Recruiter Copilot — chat IA contextual sobre candidatos, vagas e portfólio
// Tool calling + débito de créditos da conta + persistência em threads/messages
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { compressTranscript } from "../_shared/transcript-compress.ts";
import { consumeAICredits } from "../_shared/ai-credit-consumption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL_FAST = "google/gemini-3-flash-preview";
const MODEL_ADVANCED = "google/gemini-2.5-pro";
const MODEL_DEEP = "openai/gpt-5";
const MAX_TOOL_ITERATIONS = 6;

type Tier = "fast" | "advanced" | "deep";

function pickModel(opts: {
  message: string;
  scope: string;
  historyLen: number;
  userOverride?: "auto" | "deep";
}): { model: string; tier: Tier; reason: string } {
  if (opts.userOverride === "deep") {
    return { model: MODEL_DEEP, tier: "deep", reason: "user_override_deep" };
  }
  if (opts.scope === "global") {
    return { model: MODEL_ADVANCED, tier: "advanced", reason: "scope_global" };
  }
  const re = /\b(compare|comparar|ranking|melhor(es)?|preveja|prever|recomende|estrat[ée]gia|tend[êe]ncia|top\s*\d+|qual\s+(é|seria)\s+o\s+melhor)\b/i;
  if (re.test(opts.message)) {
    return { model: MODEL_ADVANCED, tier: "advanced", reason: "keyword_match" };
  }
  // Heuristic: long context (≈ each historical message ~500 tokens, threshold ~20k tokens => ~40 messages)
  if (opts.historyLen > 30) {
    return { model: MODEL_ADVANCED, tier: "advanced", reason: "long_context" };
  }
  return { model: MODEL_FAST, tier: "fast", reason: "default" };
}

// Wrapper: call gateway with retry + cross-tier fallback. Returns response or throws.
async function callGateway(payload: any, apiKey: string): Promise<{ resp: Response; usedFallback: boolean; finalModel: string }> {
  const originalModel = payload.model;
  const doFetch = (model: string) =>
    aiFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, model }),
    });

  let resp = await doFetch(originalModel);
  if (resp.ok) return { resp, usedFallback: false, finalModel: originalModel };

  // Retry once on 429/503 with same model
  if (resp.status === 429 || resp.status === 503) {
    await new Promise((r) => setTimeout(r, 1000));
    resp = await doFetch(originalModel);
    if (resp.ok) return { resp, usedFallback: false, finalModel: originalModel };
  }

  // Cross-provider/tier downgrade
  if (resp.status === 429 || resp.status === 503 || resp.status === 500) {
    const fallback =
      originalModel === MODEL_DEEP ? MODEL_ADVANCED :
      originalModel === MODEL_ADVANCED ? MODEL_FAST :
      MODEL_FAST;
    if (fallback !== originalModel) {
      console.warn(`[copilot] fallback ${originalModel} -> ${fallback}`);
      const r2 = await doFetch(fallback);
      if (r2.ok) return { resp: r2, usedFallback: true, finalModel: fallback };
      return { resp: r2, usedFallback: true, finalModel: fallback };
    }
  }
  return { resp, usedFallback: false, finalModel: originalModel };
}

const SYSTEM_PROMPT = `Você é o Copiloto de Recrutamento da plataforma GENTIA. Ajuda recrutadores a tomar decisões mais rápidas analisando dados de candidatos, entrevistas e vagas.

REGRAS CRÍTICAS:
1. SEMPRE use as ferramentas disponíveis para buscar dados antes de responder. Nunca invente.
2. Responda em português brasileiro, em formato Markdown, claro e objetivo.
3. Quando citar informações de uma entrevista, CV ou avaliação, inclua referência inline no formato [fonte:tipo:id] (ex: [fonte:cultural_interview:abc-123]).
4. Tipos válidos de fonte: cultural_interview, technical_interview, disc_result, cv, communication, candidate, job.
5. Se o usuário fizer pergunta sobre um candidato específico, comece chamando get_candidate_overview.
6. Para perguntas comparativas dentro de uma vaga, use list_job_candidates + compare_candidates.
7. Para perguntas globais, use search_candidates_global.
8. Seja conciso: tabelas markdown para comparações, bullet points para listas. Evite parágrafos longos.
9. Se não encontrar dados (ex: candidato sem entrevista cultural), diga claramente que a informação não existe.
10. Nunca exponha IDs internos no texto principal — eles vão apenas nas tags [fonte:].`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_candidate_overview",
      description: "Retorna dados gerais do candidato: nome, email, etapa atual, scores (cultural/técnico/DISC) e score unificado.",
      parameters: { type: "object", properties: { candidate_id: { type: "string" } }, required: ["candidate_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_cultural_interview",
      description: "Retorna a entrevista cultural completa do candidato: transcrição compactada, score, critérios avaliados e insights comportamentais.",
      parameters: { type: "object", properties: { candidate_id: { type: "string" } }, required: ["candidate_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_technical_interview",
      description: "Retorna a entrevista técnica do candidato: transcrição, avaliação técnica e análise de currículo.",
      parameters: { type: "object", properties: { candidate_id: { type: "string" } }, required: ["candidate_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_disc_result",
      description: "Retorna perfil DISC do candidato e match com a vaga.",
      parameters: { type: "object", properties: { candidate_id: { type: "string" } }, required: ["candidate_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_cv_analysis",
      description: "Retorna análise inteligente do CV do candidato e match com a vaga.",
      parameters: { type: "object", properties: { candidate_id: { type: "string" } }, required: ["candidate_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_job_candidates",
      description: "Lista candidatos da vaga ranqueados por score, com etapa e status. Use para comparações ou rankings.",
      parameters: {
        type: "object",
        properties: {
          job_id: { type: "string" },
          limit: { type: "number", description: "Máximo 20" },
        },
        required: ["job_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_candidates",
      description: "Tabela comparativa entre 2 a 5 candidatos por dimensão (cultural, técnico, DISC).",
      parameters: {
        type: "object",
        properties: {
          candidate_ids: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
        },
        required: ["candidate_ids"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_candidates_global",
      description: "Busca candidatos da conta inteira por filtros (etapa, score mínimo, dias parado, vaga).",
      parameters: {
        type: "object",
        properties: {
          stage: { type: "string", description: "Ex: interview, screening, hired" },
          min_score: { type: "number" },
          stalled_days: { type: "number", description: "Dias parado na etapa" },
          job_id: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
];

// ============= Tool Implementations =============

async function tool_get_candidate_overview(supabase: any, accountId: string, args: any) {
  const { data: c } = await supabase
    .from("recruitment_candidates")
    .select("id, first_name, last_name, email, phone, stage, status, tags, created_at")
    .eq("id", args.candidate_id)
    .eq("account_id", accountId)
    .maybeSingle();
  if (!c) return { error: "Candidato não encontrado nesta conta." };

  const { data: apps } = await supabase
    .from("recruitment_applications")
    .select("id, job_id, status, stage_id, score, applied_at, evaluation_status, recruitment_jobs(title)")
    .eq("candidate_id", args.candidate_id)
    .eq("account_id", accountId);

  return { candidate: c, applications: apps || [] };
}

async function tool_get_cultural_interview(supabase: any, accountId: string, args: any) {
  const { data: sessions } = await supabase
    .from("culture_interview_sessions")
    .select("id, status, matching_score, matching_analysis, completed_at, aligned_responses, misaligned_responses, responses, candidate_radar_data")
    .eq("candidate_id", args.candidate_id)
    .eq("account_id", accountId)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(1);
  const s = sessions?.[0];
  if (!s) return { error: "Sem entrevista cultural concluída." };

  const { data: criteria } = await supabase
    .from("culture_interview_criteria_evaluations")
    .select("criterion_name, score, evidence, weight")
    .eq("session_id", s.id);

  const { data: insights } = await supabase
    .from("culture_interview_behavioral_insights")
    .select("insight_type, description, evidence")
    .eq("session_id", s.id);

  // Compress transcript
  const transcript = (s.responses || [])
    .map((r: any) => `Q: ${r.question || ""}\nR: ${r.transcription || r.answer || ""}`)
    .join("\n\n");
  const compressed = compressTranscript(transcript);

  return {
    session_id: s.id,
    score: s.matching_score,
    analysis: s.matching_analysis,
    completed_at: s.completed_at,
    transcript: compressed.compressed.slice(0, 8000),
    aligned: s.aligned_responses,
    misaligned: s.misaligned_responses,
    criteria: criteria || [],
    behavioral_insights: insights || [],
  };
}

async function tool_get_technical_interview(supabase: any, accountId: string, args: any) {
  const { data: sessions } = await supabase
    .from("technical_interview_sessions")
    .select("id, status, overall_score, evaluation_summary, strengths, gaps, recommendation, completed_at, transcript, skill_scores, skill_levels")
    .eq("candidate_id", args.candidate_id)
    .eq("account_id", accountId)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(1);
  const s = sessions?.[0];
  if (!s) return { error: "Sem entrevista técnica concluída." };

  const { data: resume } = await supabase
    .from("technical_interview_resume_intelligence")
    .select("professional_summary, experience_years, skills_found, skills_match, predictive_score")
    .eq("session_id", s.id)
    .maybeSingle();

  const transcriptText = typeof s.transcript === "string" ? s.transcript : JSON.stringify(s.transcript || "");
  const compressed = compressTranscript(transcriptText);

  return {
    session_id: s.id,
    overall_score: s.overall_score,
    evaluation_summary: s.evaluation_summary,
    strengths: s.strengths,
    gaps: s.gaps,
    recommendation: s.recommendation,
    skill_scores: s.skill_scores,
    skill_levels: s.skill_levels,
    completed_at: s.completed_at,
    transcript: compressed.compressed.slice(0, 8000),
    resume_intelligence: resume,
  };
}

async function tool_get_disc_result(supabase: any, accountId: string, args: any) {
  const { data: results } = await supabase
    .from("candidate_disc_results")
    .select("*")
    .eq("candidate_id", args.candidate_id)
    .order("created_at", { ascending: false })
    .limit(1);
  const r = results?.[0];
  if (!r) return { error: "Sem avaliação DISC." };

  // Verify account via session
  const { data: session } = await supabase
    .from("candidate_disc_sessions")
    .select("account_id, job_id")
    .eq("candidate_id", args.candidate_id)
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return { error: "Sem avaliação DISC nesta conta." };

  return { disc: r, session_meta: session };
}

async function tool_get_cv_analysis(supabase: any, accountId: string, args: any) {
  const { data: cv } = await supabase
    .from("candidate_cv_intelligence")
    .select("professional_summary, seniority_level, total_years_experience, current_position, current_company, skills, languages, certifications")
    .eq("candidate_id", args.candidate_id)
    .eq("account_id", accountId)
    .maybeSingle();

  const { data: matches } = await supabase
    .from("candidate_cv_job_match")
    .select("job_id, match_score, recommendation, skills_matched, skills_missing, red_flags, highlights, summary, interview_focus_points")
    .eq("candidate_id", args.candidate_id)
    .eq("account_id", accountId);

  if (!cv && (!matches || matches.length === 0)) return { error: "Sem análise de CV." };
  return { cv_intelligence: cv, job_matches: matches || [] };
}

async function tool_list_job_candidates(supabase: any, accountId: string, args: any) {
  const limit = Math.min(args.limit || 10, 20);
  const { data: apps } = await supabase
    .from("recruitment_applications")
    .select("id, candidate_id, status, stage_id, score, evaluation_status, applied_at, recruitment_candidates(first_name, last_name, email)")
    .eq("job_id", args.job_id)
    .eq("account_id", accountId)
    .order("score", { ascending: false, nullsFirst: false })
    .limit(limit);

  return { candidates: apps || [] };
}

async function tool_compare_candidates(supabase: any, accountId: string, args: any) {
  const ids = args.candidate_ids.slice(0, 5);
  const { data: cands } = await supabase
    .from("recruitment_candidates")
    .select("id, first_name, last_name")
    .in("id", ids)
    .eq("account_id", accountId);

  const { data: apps } = await supabase
    .from("recruitment_applications")
    .select("candidate_id, job_id, score, status, stage_id, evaluation_status")
    .in("candidate_id", ids)
    .eq("account_id", accountId);

  return { candidates: cands || [], applications: apps || [] };
}

async function tool_search_candidates_global(supabase: any, accountId: string, args: any) {
  let q = supabase
    .from("recruitment_applications")
    .select("id, candidate_id, job_id, status, stage_id, score, evaluation_status, applied_at, updated_at, recruitment_candidates(first_name, last_name, email), recruitment_jobs(title)")
    .eq("account_id", accountId);

  if (args.job_id) q = q.eq("job_id", args.job_id);
  if (typeof args.min_score === "number") q = q.gte("score", args.min_score);
  if (args.stalled_days) {
    const cutoff = new Date(Date.now() - args.stalled_days * 86400000).toISOString();
    q = q.lt("updated_at", cutoff);
  }

  const limit = Math.min(args.limit || 15, 30);
  q = q.order("score", { ascending: false, nullsFirst: false }).limit(limit);

  const { data, error } = await q;
  if (error) return { error: error.message };
  return { results: data || [] };
}

const TOOL_HANDLERS: Record<string, (s: any, a: string, args: any) => Promise<any>> = {
  get_candidate_overview: tool_get_candidate_overview,
  get_cultural_interview: tool_get_cultural_interview,
  get_technical_interview: tool_get_technical_interview,
  get_disc_result: tool_get_disc_result,
  get_cv_analysis: tool_get_cv_analysis,
  list_job_candidates: tool_list_job_candidates,
  compare_candidates: tool_compare_candidates,
  search_candidates_global: tool_search_candidates_global,
};

// ============= Main handler =============

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { thread_id, account_id, scope, candidate_id, job_id, message, mode } = body;
    const userOverride: "auto" | "deep" = mode === "deep" ? "deep" : "auto";

    if (!account_id || !scope || !message) {
      return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify account access (membership OR consultant assignment OR super admin)
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const roleSet = new Set((roles || []).map((r: any) => r.role));
    let hasAccess = roleSet.has("super_admin") || roleSet.has("head_cs");
    if (!hasAccess) {
      const { data: member } = await supabase.from("account_members").select("id").eq("user_id", user.id).eq("account_id", account_id).eq("is_active", true).maybeSingle();
      if (member) hasAccess = true;
    }
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pre-check credits
    const { data: creditRow } = await supabase
      .from("recruitment_usage_credits")
      .select("balance")
      .eq("account_id", account_id)
      .eq("credit_type", "universal")
      .maybeSingle();
    if (!creditRow || Number(creditRow.balance) < 0.5) {
      return new Response(JSON.stringify({ error: "insufficient_credits", message: "Créditos insuficientes para usar o Copilot. Adquira mais créditos para continuar." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get or create thread
    let threadId = thread_id;
    if (!threadId) {
      const { data: newThread, error: threadErr } = await supabase
        .from("recruiter_copilot_threads")
        .insert({ account_id, created_by: user.id, scope, candidate_id: candidate_id || null, job_id: job_id || null, title: message.slice(0, 80) })
        .select("id")
        .single();
      if (threadErr) {
        console.error("Thread create error:", threadErr);
        return new Response(JSON.stringify({ error: "thread_create_failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      threadId = newThread.id;
    }

    // Load history
    const { data: history } = await supabase
      .from("recruiter_copilot_messages")
      .select("role, content, tool_calls, tool_call_id")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(40);

    // Persist user message
    await supabase.from("recruiter_copilot_messages").insert({
      thread_id: threadId,
      role: "user",
      content: message,
    });

    // Build context block
    const contextLines: string[] = [`Contexto: escopo=${scope}, account_id=${account_id}`];
    if (candidate_id) contextLines.push(`candidate_id=${candidate_id}`);
    if (job_id) contextLines.push(`job_id=${job_id}`);
    const systemMsg = SYSTEM_PROMPT + "\n\n" + contextLines.join("\n");

    // Build messages array
    const messages: any[] = [
      { role: "system", content: systemMsg },
      ...(history || []).map((m: any) => {
        const msg: any = { role: m.role, content: m.content || "" };
        if (m.tool_calls) msg.tool_calls = m.tool_calls;
        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
        return msg;
      }),
      { role: "user", content: message },
    ];

    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    // Pick model tier based on heuristics + user override
    const picked = pickModel({
      message,
      scope,
      historyLen: (history || []).length,
      userOverride,
    });
    let currentModel = picked.model;
    let currentTier: Tier = picked.tier;
    console.log(`[copilot] tier=${currentTier} model=${currentModel} reason=${picked.reason}`);

    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let finalContent = "";
    let lastAiData: any = null;

    // Tool calling loop
    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
      const { resp: aiResp, finalModel } = await callGateway({
        model: currentModel,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      }, LOVABLE_API_KEY);

      // Track if fallback downgraded the model
      if (finalModel !== currentModel) {
        currentModel = finalModel;
        currentTier =
          finalModel === MODEL_DEEP ? "deep" :
          finalModel === MODEL_ADVANCED ? "advanced" : "fast";
      }

      if (!aiResp.ok) {
        const errText = await aiResp.text();
        console.error("AI gateway error:", aiResp.status, errText);
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ error: "rate_limited", message: "Limite temporário do gateway. Tente novamente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (aiResp.status === 402) {
          return new Response(JSON.stringify({ error: "ai_credits_exhausted", message: "Créditos da plataforma esgotados. Contate o suporte." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ error: "ai_gateway_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const aiData = await aiResp.json();
      lastAiData = aiData;
      totalTokensIn += aiData.usage?.prompt_tokens || 0;
      totalTokensOut += aiData.usage?.completion_tokens || 0;

      const choice = aiData.choices?.[0];
      const msg = choice?.message;
      if (!msg) break;

      // Tool calls?
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        await supabase.from("recruiter_copilot_messages").insert({
          thread_id: threadId,
          role: "assistant",
          content: msg.content || "",
          tool_calls: msg.tool_calls,
        });
        messages.push({ role: "assistant", content: msg.content || "", tool_calls: msg.tool_calls });

        for (const tc of msg.tool_calls) {
          const fnName = tc.function?.name;
          let args: any = {};
          try { args = JSON.parse(tc.function?.arguments || "{}"); } catch {}
          const handler = TOOL_HANDLERS[fnName];
          let result: any;
          if (!handler) {
            result = { error: `Tool desconhecida: ${fnName}` };
          } else {
            try {
              result = await handler(supabase, account_id, args);
            } catch (e) {
              console.error(`Tool ${fnName} error:`, e);
              result = { error: e instanceof Error ? e.message : "Erro na ferramenta" };
            }
          }
          const resultStr = JSON.stringify(result);
          await supabase.from("recruiter_copilot_messages").insert({
            thread_id: threadId,
            role: "tool",
            content: resultStr.slice(0, 100000),
            tool_call_id: tc.id,
          });
          messages.push({ role: "tool", tool_call_id: tc.id, content: resultStr });
        }
        continue;
      }

      finalContent = msg.content || "";
      break;
    }

    // Extract source citations [fonte:tipo:id]
    const sources: Array<{ type: string; id: string }> = [];
    const sourceRegex = /\[fonte:([a-z_]+):([a-z0-9-]+)\]/gi;
    let sm;
    while ((sm = sourceRegex.exec(finalContent)) !== null) {
      sources.push({ type: sm[1], id: sm[2] });
    }

    // Debit credits based on accumulated tokens (priced at the actual model used)
    const creditResult = await consumeAICredits({
      supabase,
      accountId: account_id,
      aiData: { usage: { prompt_tokens: totalTokensIn, completion_tokens: totalTokensOut } },
      model: currentModel,
      referenceId: threadId,
      referenceType: "copilot_message",
      description: `Recruiter Copilot (${scope}, ${currentTier})`,
      userId: user.id,
    });

    const { data: finalMsg } = await supabase.from("recruiter_copilot_messages").insert({
      thread_id: threadId,
      role: "assistant",
      content: finalContent,
      sources: sources.length ? sources : null,
      tokens_in: totalTokensIn,
      tokens_out: totalTokensOut,
      credits_consumed: creditResult.creditsConsumed,
      model: currentModel,
      model_used: currentModel,
      tier: currentTier,
    }).select("id, created_at").single();

    await supabase.from("recruiter_copilot_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);

    return new Response(
      JSON.stringify({
        thread_id: threadId,
        message_id: finalMsg?.id,
        content: finalContent,
        sources,
        tokens_in: totalTokensIn,
        tokens_out: totalTokensOut,
        credits_consumed: creditResult.creditsConsumed,
        model: currentModel,
        tier: currentTier,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("recruiter-copilot fatal:", e);
    return new Response(JSON.stringify({ error: "internal", message: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
