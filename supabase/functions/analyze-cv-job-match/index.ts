// Edge Function: analyze-cv-job-match
// Acionada manualmente pelo recrutador (botão "Análise Profunda").
// Cruza candidate_cv_intelligence + recruitment_jobs (ICP/JD) com Gemini Flash
// e devolve red_flags, highlights, focus points + match_score.
// Cobra créditos: custo_usd × usd_to_brl × (1 + margin/100) / credit_value_brl.
// Cache: resultado válido por 30 dias para o par candidato+vaga.
import { createClient } from "npm:@supabase/supabase-js@2";
import { callLLMTool } from "../_shared/llm-tool-call.ts";
import { logAIExecution } from "../_shared/ai-logger.ts";
import { getEvaluatorTier, getMaxTokensForTier } from "../_shared/evaluator-tier.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MATCH_MODEL = "google/gemini-3-flash-preview";
const OPTIMIZATION_VERSION = "v1_tooling_cache";

interface MatchPayload {
  candidate_id: string;
  job_id: string;
  force?: boolean; // ignora cache
}

const SYSTEM_PROMPT = `Você é um analista sênior de R&S. Compare o currículo de um candidato com a descrição da vaga e o ICP (perfil ideal). Seja objetivo. Foque em fato (anos de experiência, tecnologias, escopo). Se faltar dado, prefira "maybe" a inventar.`;

const MATCH_TOOL_SCHEMA = {
  type: "object",
  properties: {
    match_score: { type: "number", description: "Score 0-100." },
    recommendation: {
      type: "string",
      enum: ["strong_yes", "yes", "maybe", "no", "strong_no"],
    },
    summary: { type: "string", description: "2-3 frases objetivas." },
    skills_matched: { type: "array", items: { type: "string" } },
    skills_missing: { type: "array", items: { type: "string" } },
    skills_extra: { type: "array", items: { type: "string" } },
    red_flags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["low", "medium", "high"] },
          description: { type: "string" },
        },
        required: ["severity", "description"],
      },
    },
    highlights: { type: "array", items: { type: "string" } },
    interview_focus_points: { type: "array", items: { type: "string" } },
  },
  required: [
    "match_score", "recommendation", "summary",
    "skills_matched", "skills_missing", "red_flags",
    "highlights", "interview_focus_points",
  ],
} as const;


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "missing auth" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = auth.replace("Bearer ", "");
    const { data: userData, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const payload: MatchPayload = await req.json();
    if (!payload.candidate_id || !payload.job_id) {
      return new Response(JSON.stringify({ error: "candidate_id and job_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validar acesso (account membership)
    const { data: job } = await supabaseAdmin
      .from("recruitment_jobs")
      .select("id, account_id, title, description, department, location, work_regime, work_modality, employment_type, additional_info, job_description_id")
      .eq("id", payload.job_id)
      .maybeSingle();
    if (!job) return new Response(JSON.stringify({ error: "job not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const { data: isMember } = await supabaseAdmin.rpc("is_account_member", {
      _user_id: userId, _account_id: job.account_id,
    });
    if (!isMember) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache hit
    if (!payload.force) {
      const { data: cached } = await supabaseAdmin
        .from("candidate_cv_job_match")
        .select("*")
        .eq("candidate_id", payload.candidate_id)
        .eq("job_id", payload.job_id)
        .maybeSingle();
      if (cached && new Date(cached.expires_at) > new Date()) {
        return new Response(JSON.stringify({ ok: true, cached: true, match: cached }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Buscar inteligência do CV
    const { data: cv } = await supabaseAdmin
      .from("candidate_cv_intelligence")
      .select("*")
      .eq("candidate_id", payload.candidate_id)
      .maybeSingle();
    if (!cv) {
      return new Response(JSON.stringify({ error: "cv_not_parsed", message: "CV ainda não foi processado." }), {
        status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute stable CV hash for cross-candidate cache
    async function sha256Hex(text: string): Promise<string> {
      const enc = new TextEncoder().encode(text);
      const buf = await crypto.subtle.digest("SHA-256", enc);
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    const canonicalCv = JSON.stringify({
      summary: (cv.professional_summary || "").trim(),
      work: cv.work_history || [],
      edu: cv.education || [],
      skills: cv.skills || [],
      langs: cv.languages || [],
      certs: cv.certifications || [],
    });
    const cvHash = await sha256Hex(canonicalCv);

    // Cross-candidate cache lookup (cv_hash + job_id)
    if (!payload.force) {
      const { data: cachedShared } = await supabaseAdmin
        .from("cv_match_cache")
        .select("*")
        .eq("cv_hash", cvHash)
        .eq("job_id", payload.job_id)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (cachedShared) {
        // Mirror result into per-candidate table (no LLM cost, no credit charge)
        const mirrorRow = {
          account_id: job.account_id,
          candidate_id: payload.candidate_id,
          job_id: payload.job_id,
          cv_intelligence_id: cv.id,
          match_score: cachedShared.match_score,
          recommendation: cachedShared.recommendation,
          ...((cachedShared.breakdown || {}) as Record<string, unknown>),
          model_used: cachedShared.model_used,
          cost_usd: 0,
          credits_consumed: 0,
          triggered_by: userId,
          expires_at: cachedShared.expires_at,
        };
        const { data: mirrored } = await supabaseAdmin
          .from("candidate_cv_job_match")
          .upsert(mirrorRow, { onConflict: "candidate_id,job_id" })
          .select("*").single();
        // Log shared cache hit (no cost)
        logAIExecution(supabaseAdmin, {
          accountId: job.account_id,
          functionName: "analyze-cv-job-match",
          operation: "cv_job_match",
          model: cachedShared.model_used || MATCH_MODEL,
          status: "success",
          tokensUsed: 0,
          estimatedCost: 0,
          optimizationVersion: OPTIMIZATION_VERSION,
          inputSummary: { candidate_id: payload.candidate_id, job_id: payload.job_id, cache: "cv_hash" },
          outputSummary: { match_score: cachedShared.match_score, recommendation: cachedShared.recommendation },
          metadata: { cache_hit: true, cache_source: "cv_match_cache", cv_hash: cvHash },
        }).catch(() => {});
        return new Response(JSON.stringify({ ok: true, cached: true, cache_source: "cv_hash", match: mirrored }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    // Buscar ICP/JD complementar
    let jdText = job.description || "";
    let icpJson: any = null;
    if (job.job_description_id) {
      const { data: jd } = await supabaseAdmin
        .from("job_descriptions")
        .select("title, mission, responsibilities, required_skills, desired_skills, behavioral_competencies")
        .eq("id", job.job_description_id).maybeSingle();
      if (jd) jdText = JSON.stringify(jd);
    }
    const { data: icp } = await supabaseAdmin
      .from("job_icps")
      .select("*")
      .eq("job_id", payload.job_id)
      .maybeSingle();
    if (icp) icpJson = icp;

    const userPrompt = `VAGA:
Título: ${job.title}
Departamento: ${job.department || "—"}
Local: ${job.location || "—"} | Regime: ${job.work_regime || "—"} | Modalidade: ${job.work_modality || "—"}
Descrição/JD: ${jdText.slice(0, 4000)}

ICP (perfil ideal):
${icpJson ? JSON.stringify(icpJson).slice(0, 3000) : "(sem ICP)"}

CANDIDATO:
Nome: ${cv.full_name || "—"}
Senioridade: ${cv.seniority_level || "—"} | Anos exp: ${cv.total_years_experience ?? "—"}
Cargo atual: ${cv.current_position || "—"} @ ${cv.current_company || "—"}
Resumo: ${cv.professional_summary || "—"}
Histórico: ${JSON.stringify(cv.work_history).slice(0, 3000)}
Formação: ${JSON.stringify(cv.education)}
Skills: ${JSON.stringify(cv.skills)}
Idiomas: ${JSON.stringify(cv.languages)}
Certificações: ${JSON.stringify(cv.certifications)}`;

    const evaluatorTier = await getEvaluatorTier(supabaseAdmin as any, job.account_id);
    const llmStart = Date.now();
    const { args: parsed, usage } = await callLLMTool<any>({
      model: MATCH_MODEL,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      tool: {
        name: "submit_cv_match_analysis",
        description: "Devolve a análise estruturada de fit candidato x vaga.",
        parameters: MATCH_TOOL_SCHEMA,
      },
      maxTokens: getMaxTokensForTier(evaluatorTier, "cv-match"),
      cacheKey: payload.job_id,
    });
    const llmDurationMs = Date.now() - llmStart;
    const inTok = usage.prompt_tokens || 0;
    const outTok = usage.completion_tokens || 0;
    // Gemini 3 Flash preview pricing estimate: $0.30/1M in, $2.50/1M out
    const costUsd = (inTok * 0.30 + outTok * 2.50) / 1_000_000;

    // Observability log
    logAIExecution(supabaseAdmin, {
      accountId: job.account_id,
      functionName: "analyze-cv-job-match",
      operation: "cv_job_match",
      model: MATCH_MODEL,
      status: "success",
      tokensUsed: usage.total_tokens || (inTok + outTok),
      estimatedCost: costUsd,
      durationMs: llmDurationMs,
      optimizationVersion: OPTIMIZATION_VERSION,
      cachedTokens: (usage as any).cached_tokens ?? null,
      inputSummary: { candidate_id: payload.candidate_id, job_id: payload.job_id, prompt_chars: userPrompt.length, tier: evaluatorTier },
      outputSummary: { match_score: parsed.match_score, recommendation: parsed.recommendation },
    }).catch(() => {});


    // Cobrar créditos: custo + margem
    const { data: cfg } = await supabaseAdmin
      .from("platform_credit_config")
      .select("usd_to_brl, margin_percent, credit_value_brl")
      .limit(1).single();
    const usdToBrl = cfg?.usd_to_brl ?? 5.65;
    const marginPct = cfg?.margin_percent ?? 50;
    const creditValueBrl = cfg?.credit_value_brl ?? 1.39;
    const costBrl = costUsd * usdToBrl * (1 + marginPct / 100);
    const creditsToConsume = Math.max(Math.round((costBrl / creditValueBrl) * 10) / 10, 0.1);

    const { data: creditResult, error: creditErr } = await supabaseAdmin.rpc("consume_credits", {
      p_account_id: job.account_id,
      p_credit_type: "universal",
      p_amount: creditsToConsume,
      p_reference_id: payload.candidate_id,
      p_reference_type: "ai_cv_match",
      p_description: `Análise Profunda CV — ${cv.full_name || "candidato"} x ${job.title}`,
      p_user_id: userId,
    });

    if (creditErr) {
      console.error("[cv-match] credit error:", creditErr);
    }
    if (creditResult && !creditResult.success) {
      return new Response(JSON.stringify({
        success: false, error: "insufficient_credits",
        message: creditResult.message || "Créditos insuficientes",
        required: creditResult.required, available: creditResult.available,
      }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Persistir
    const matchRow = {
      account_id: job.account_id,
      candidate_id: payload.candidate_id,
      job_id: payload.job_id,
      cv_intelligence_id: cv.id,
      match_score: parsed.match_score ?? null,
      recommendation: parsed.recommendation || null,
      summary: parsed.summary || null,
      skills_matched: parsed.skills_matched || [],
      skills_missing: parsed.skills_missing || [],
      skills_extra: parsed.skills_extra || [],
      red_flags: parsed.red_flags || [],
      highlights: parsed.highlights || [],
      interview_focus_points: parsed.interview_focus_points || [],
      icp_version_used: icpJson?.updated_at || null,
      model_used: MATCH_MODEL,
      cost_usd: costUsd,
      credits_consumed: creditsToConsume,
      triggered_by: userId,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const { data: saved, error: saveErr } = await supabaseAdmin
      .from("candidate_cv_job_match")
      .upsert(matchRow, { onConflict: "candidate_id,job_id" })
      .select("*").single();
    if (saveErr) throw saveErr;

    // Save to shared cross-candidate cache (cv_hash + job_id)
    await supabaseAdmin.from("cv_match_cache").upsert({
      cv_hash: cvHash,
      job_id: payload.job_id,
      account_id: job.account_id,
      match_score: parsed.match_score ?? null,
      recommendation: parsed.recommendation || null,
      breakdown: {
        summary: parsed.summary || null,
        skills_matched: parsed.skills_matched || [],
        skills_missing: parsed.skills_missing || [],
        skills_extra: parsed.skills_extra || [],
        red_flags: parsed.red_flags || [],
        highlights: parsed.highlights || [],
        interview_focus_points: parsed.interview_focus_points || [],
      },
      model_used: MATCH_MODEL,
      tokens_used: usage.total_tokens || (inTok + outTok),
      estimated_cost: costUsd,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "cv_hash,job_id" }).then(({ error }) => {
      if (error) console.error("[cv-match] cache save error:", error);
    });

    console.log(`[cv-match] OK candidate=${payload.candidate_id} job=${payload.job_id} score=${parsed.match_score} cost=$${costUsd.toFixed(4)} credits=${creditsToConsume}`);

    return new Response(JSON.stringify({
      ok: true, cached: false, match: saved,
      credits_consumed: creditsToConsume,
      cost_usd: costUsd,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[cv-match] error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
