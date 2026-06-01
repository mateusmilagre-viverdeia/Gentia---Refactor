// Compare Finalists — análise comparativa de candidatos finalistas via Lovable AI (streaming SSE)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { consumeAICredits } from "../_shared/ai-credit-consumption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-pro";
const MAX_CANDIDATES = 5;

const SYSTEM_PROMPT = `Você é um consultor sênior de recrutamento e seleção da plataforma GENTIA.
Seu papel é ajudar a equipe de R&S a tomar a melhor decisão de contratação comparando finalistas.

Regras obrigatórias:
1) Responda em português do Brasil, em markdown bem estruturado.
2) Use estas seções, nesta ordem:
   ## Ranking sugerido
   (lista numerada com nome do candidato + 1 linha de justificativa)
   ## Análise individual
   (subseção por candidato com Pontos fortes, Pontos de atenção e Sinais relevantes — cite scores explicitamente)
   ## Recomendação final
   (1 candidato indicado para contratação + justificativa em 3-5 linhas conectando dados)
   ## Riscos e perguntas para validar
   (bullets com riscos do candidato recomendado e perguntas de checagem para o recrutador fazer)
3) Compare nas dimensões: Fit Cultural, Comportamental (DISC), Técnico e sinais qualitativos.
4) NUNCA invente informação. Se faltar dado, escreva "dado ausente" e siga.
5) Se o usuário fornecer um foco da análise, honre-o (ex.: priorizar cultural sobre técnico).
6) Seja direto. Evite repetições e adjetivos vazios.`;

interface Body {
  jobId: string;
  candidateIds: string[];
  focus?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(
      token,
    );
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    const body = (await req.json()) as Body;
    if (!body?.jobId || !Array.isArray(body.candidateIds) || body.candidateIds.length < 2) {
      return json({ error: "jobId e ao menos 2 candidateIds são obrigatórios" }, 400);
    }
    const candidateIds = body.candidateIds.slice(0, MAX_CANDIDATES);

    // 1) Vaga + autorização
    const { data: job, error: jobErr } = await supabaseAdmin
      .from("recruitment_jobs")
      .select("id, account_id, title, description")
      .eq("id", body.jobId)
      .maybeSingle();

    if (jobErr || !job) return json({ error: "Vaga não encontrada" }, 404);

    // Autorização: membro da conta OU consultor com acesso ao cliente
    const { data: isMember } = await supabaseAdmin.rpc("is_account_member", {
      _user_id: userId,
      _account_id: job.account_id,
    });
    let allowed = !!isMember;
    if (!allowed) {
      const { data: canEdit } = await supabaseAdmin.rpc(
        "can_edit_client_project",
        { _user_id: userId, _account_id: job.account_id },
      );
      allowed = !!canEdit;
    }
    if (!allowed) return json({ error: "Acesso negado a esta vaga" }, 403);

    // 2) Coleta dados (paralelo) — todos restritos por jobId
    const [candidatesRes, cultureRes, discRes, techRes, screeningRes] =
      await Promise.all([
        supabaseAdmin
          .from("recruitment_candidates")
          .select(
            "id, first_name, last_name, email, phone, linkedin_url, source, notes",
          )
          .in("id", candidateIds),
        supabaseAdmin
          .from("culture_interview_sessions")
          .select(
            "candidate_id, status, matching_score, matching_analysis, aligned_responses, misaligned_responses, completed_at",
          )
          .eq("job_id", body.jobId)
          .in("candidate_id", candidateIds),
        supabaseAdmin
          .from("candidate_disc_sessions")
          .select("id, candidate_id, status, completed_at")
          .eq("job_id", body.jobId)
          .in("candidate_id", candidateIds),
        supabaseAdmin
          .from("technical_interview_sessions")
          .select(
            "candidate_id, status, overall_score, completed_at",
          )
          .eq("job_id", body.jobId)
          .in("candidate_id", candidateIds),
        supabaseAdmin
          .from("recruitment_screening_results")
          .select("candidate_id, passed, completed_at")
          .eq("job_id", body.jobId)
          .in("candidate_id", candidateIds),
      ]);

    // DISC scores via RPC
    const discIds = (discRes.data || []).map((d: any) => d.id);
    const discScoresRes = discIds.length
      ? await supabaseAdmin.rpc("get_disc_match_scores", {
        p_session_ids: discIds,
      })
      : { data: [] };
    const discScoreMap = new Map(
      (discScoresRes.data || []).map((r: any) => [r.session_id, r.match_score]),
    );

    // Index por candidato
    const byCand = new Map<string, any>();
    for (const c of candidatesRes.data || []) {
      byCand.set(c.id, {
        id: c.id,
        nome: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Candidato",
        email: c.email || null,
        telefone: c.phone || null,
        linkedin: c.linkedin_url || null,
        origem: c.source || null,
        notas_recrutador: trimText(c.notes, 400),
        cultural: null as any,
        disc: null as any,
        tecnico: null as any,
        triagem: null as any,
      });
    }
    for (const s of cultureRes.data || []) {
      const c = byCand.get(s.candidate_id);
      if (!c || s.status !== "completed") continue;
      c.cultural = {
        score: s.matching_score,
        analise: trimText(s.matching_analysis, 800),
        alinhados: shortList(s.aligned_responses),
        desalinhados: shortList(s.misaligned_responses),
      };
    }
    for (const s of discRes.data || []) {
      const c = byCand.get(s.candidate_id);
      if (!c || s.status !== "completed") continue;
      const score = discScoreMap.get(s.id) ?? null;
      if (score == null) continue;
      c.disc = { match_score: score };
    }
    for (const s of techRes.data || []) {
      const c = byCand.get(s.candidate_id);
      if (!c || s.status !== "completed") continue;
      c.tecnico = { overall_score: s.overall_score };
    }
    for (const s of screeningRes.data || []) {
      const c = byCand.get(s.candidate_id);
      if (!c) continue;
      c.triagem = { passou: s.passed === true };
    }

    const candidatesPayload = Array.from(byCand.values());
    if (candidatesPayload.length < 2) {
      return json({ error: "Ao menos 2 candidatos válidos são necessários" }, 400);
    }

    // 3) Monta prompt
    const userPrompt = [
      `# Vaga`,
      `Título: ${job.title}`,
      job.description ? `Descrição: ${trimText(job.description, 1500)}` : "Descrição: (não informada)",
      ``,
      body.focus ? `# Foco da análise pelo recrutador\n${body.focus.trim()}\n` : "",
      `# Finalistas (${candidatesPayload.length})`,
      "```json",
      JSON.stringify(candidatesPayload, null, 2),
      "```",
      ``,
      `Compare os finalistas seguindo as seções obrigatórias e cite scores ao justificar.`,
    ].filter(Boolean).join("\n");

    // 4) Chama Lovable AI Gateway com streaming
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY não configurada" }, 500);

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          stream: true,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
      },
    );

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return json(
          { error: "Limite de requisições atingido. Tente novamente em instantes." },
          429,
        );
      }
      if (aiResp.status === 402) {
        return json(
          { error: "Créditos insuficientes. Adicione créditos na sua workspace." },
          402,
        );
      }
      const errTxt = await aiResp.text().catch(() => "");
      console.error("AI gateway error:", aiResp.status, errTxt);
      return json({ error: "Falha na IA" }, 500);
    }

    // Tee o stream: 1 cópia segue para o cliente, outra acumula para débito de créditos
    const [clientStream, debitStream] = aiResp.body!.tee();

    // Background: lê o stream secundário para extrair `usage` e debitar créditos
    queueMicrotask(async () => {
      try {
        const reader = debitStream.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let usage: any = null;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const obj = JSON.parse(payload);
              if (obj.usage) usage = obj.usage;
            } catch {
              /* ignore partial */
            }
          }
        }
        if (usage) {
          await consumeAICredits({
            supabase: supabaseAdmin,
            accountId: job.account_id,
            aiData: { usage },
            model: MODEL,
            referenceId: job.id,
            referenceType: "compare_finalists",
            description: `Análise comparativa de ${candidatesPayload.length} finalistas`,
            userId,
          });
        }
      } catch (e) {
        console.error("debit stream error:", e);
      }
    });

    return new Response(clientStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("compare-finalists error:", e);
    return json(
      { error: e instanceof Error ? e.message : "Erro desconhecido" },
      500,
    );
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function trimText(t: string | null | undefined, max: number): string | null {
  if (!t) return null;
  const s = String(t).trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function shortList(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  return v
    .map((x: any) => (typeof x === "string" ? x : x?.question || x?.text || ""))
    .filter(Boolean)
    .slice(0, 5)
    .map((s: string) => trimText(s, 200) as string);
}
