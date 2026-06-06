// Read-only simulator: roda a avaliação cultural com o prompt V1 (legado, neutro,
// sem postura cética, sem red flags -15/-25, sem evidence floor, sem eliminators).
// NÃO escreve no banco. Apenas retorna a nota simulada e breakdown.
//
// Uso (admin): POST { sessionId } com Authorization: Bearer <SERVICE_ROLE_KEY>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { calculateFinalScoreLegacy } from "../_shared/culture-evaluation-v2.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IMPORTANCE_LABELS: Record<string, string> = {
  minor: "Pouco Importante (x1)", moderate: "Moderado (x2)", important: "Importante (x3)",
  very_important: "Muito Importante (x4)", critical: "Crítico (x5)",
};

// ---- V1 PROMPT (reconstruído do legado original em reprocess-culture-evaluation) ----
const EVALUATION_SYSTEM_PROMPT_V1 = `Você é um especialista sênior em avaliação de fit cultural e RH comportamental.

SUA TAREFA:
Analisar a transcrição de uma entrevista cultural e avaliar o candidato em CADA critério fornecido, com sensibilidade ao contexto e ao estilo da resposta.

PRINCÍPIOS:
1. Para CADA critério, atribua uma nota de 0.0 a 100.0 (percentual de alcance).
2. Justifique a nota citando ou parafraseando as respostas do candidato. Aceite sinais conceituais (princípios, crenças, atitudes declaradas) como evidência válida quando não houver narrativa concreta — apenas pontue um pouco abaixo da faixa "satisfatório" nesse caso.
3. Use as descrições de excelência e sinais de alerta do critério como guia interpretativo, não como checklist rígido.
4. Considere o conjunto da entrevista (incluindo cobertura, follow-ups feitos ou não pelo entrevistador) antes de penalizar ausência de exemplos.

ESCALA DE NOTAS (PERCENTUAL):
- 0-20%: Candidato demonstrou comportamentos CONTRÁRIOS ao critério
- 21-40%: Candidato demonstrou de forma ABSTRATA ou GENÉRICA, sem articulação clara
- 41-60%: Candidato demonstrou PARCIALMENTE (conceitualmente alinhado, mas sem narrativa ou com ressalvas)
- 61-80%: Candidato demonstrou alinhamento SATISFATÓRIO (conceitual claro e/ou narrativa coerente)
- 81-100%: Candidato demonstrou EXCELÊNCIA (alinhamento conceitual + exemplos concretos e consistentes)

NÍVEIS DE ALINHAMENTO:
- Baixo: score < nota mínima do critério
- Moderado: score >= nota mínima e < 80%
- Forte: score >= 80%

Inclua, quando houver, citações diretas das respostas; quando não houver, parafraseie com fidelidade.`;

function buildPromptV1(
  responses: any[],
  criteria: any[],
  cultureContext: any,
  jobContext: any,
  sellingContent: string,
): string {
  return `
## CONTEXTO DA EMPRESA

Missão: ${cultureContext.mission || "Não informada"}
Visão: ${cultureContext.vision || "Não informada"}

Valores e Comportamentos:
${cultureContext.values?.length > 0
  ? cultureContext.values.map((v: any) => `- **${v.label}**: Fazemos (${v.dos?.join("; ")}), Não fazemos (${v.donts?.join("; ")})`).join("\n")
  : "Não informados"}

${sellingContent ? `Proposta de Valor da Empresa (EVP):\n${sellingContent.substring(0, 2000)}\n` : ""}

${jobContext ? `## VAGA

Cargo: ${jobContext.title}
Missão: ${jobContext.mission || "Não informada"}
Competências Comportamentais: ${jobContext.behavioralCompetencies?.join(", ") || "Não informadas"}
` : ""}

## CRITÉRIOS DE AVALIAÇÃO (${criteria.length} critérios)

${criteria.map((c, i) => `
### ${i + 1}. ${c.name} (ID: ${c.id})
- **Descrição:** ${c.description}
- **Sinais de EXCELÊNCIA:** ${c.excellenceDescription || "Não especificado"}
- **Sinais de ALERTA:** ${c.warningSignsDescription || "Não especificado"}
- **Nota Mínima de Corte:** ${c.minimumScore * 10}%
- **Importância:** ${IMPORTANCE_LABELS[c.importance]}
- **Peso:** ${c.weight}
`).join("\n")}

## TRANSCRIÇÃO DA ENTREVISTA (${responses.length} perguntas/respostas)

${responses.map((r: any, i: number) => `
[P${i}] ${r.question_text || ""}
[R${i}] "${r.candidate_response || ""}"
`).join("\n---\n")}

## INSTRUÇÕES DE AVALIAÇÃO

Avalie o candidato em CADA um dos ${criteria.length} critérios listados acima.

Responda APENAS em JSON válido conforme o schema:
{
  "criteriaEvaluations": [
    {
      "criterionId": "<UUID>",
      "criterionName": "<nome>",
      "score": <0.0 a 100.0>,
      "justification": "<2-4 frases com citações>",
      "alignmentLevel": "<Baixo|Moderado|Forte>",
      "positiveEvidence": [{ "questionIndex": <num>, "quote": "<>", "analysis": "<>" }],
      "negativeEvidence": [{ "questionIndex": <num>, "quote": "<>", "analysis": "<>" }],
      "questionsUsed": [<índices>]
    }
  ],
  "overallSummary": "<síntese qualitativa>",
  "candidateStrengths": ["<ponto forte>"],
  "candidateConcerns": ["<preocupação>"]
}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth: aceita apenas service role ou super admin (ferramenta interna)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceKey;
    if (!isServiceRole) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: sa } = await supabase.rpc("is_super_admin", { _user_id: user.id });
      if (sa !== true) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { sessionId, model: requestedModel } = await req.json();
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load session
    const { data: session } = await supabase.from("culture_interview_sessions").select("*").eq("id", sessionId).single();
    if (!session) return new Response(JSON.stringify({ error: "session not found" }), { status: 404, headers: corsHeaders });

    const accountId = session.account_id;

    // Responses
    const { data: responses } = await supabase
      .from("culture_interview_responses").select("*").eq("session_id", sessionId)
      .order("question_index", { ascending: true });
    if (!responses || responses.length === 0) {
      return new Response(JSON.stringify({ error: "no responses" }), { status: 400, headers: corsHeaders });
    }

    // Resolve agent (4 fallbacks como reprocess)
    let agentId: string | null = session.agent_id || null;
    if (!agentId) {
      const { data: job } = await supabase.from("recruitment_jobs").select("agent_id").eq("id", session.job_id).maybeSingle();
      agentId = job?.agent_id || null;
    }
    if (!agentId) {
      const { data: step } = await supabase.from("recruitment_job_workflow_steps")
        .select("agent_id").eq("job_id", session.job_id).eq("step_type", "cultural").eq("is_active", true)
        .not("agent_id", "is", null).order("position", { ascending: true }).limit(1).maybeSingle();
      agentId = step?.agent_id || null;
    }
    if (!agentId) {
      const { data: agent } = await supabase.from("recruitment_agents")
        .select("id").eq("account_id", accountId).in("type", ["cultural", "structured"]).eq("is_active", true).limit(1).maybeSingle();
      agentId = agent?.id || null;
    }
    if (!agentId) return new Response(JSON.stringify({ error: "no agent" }), { status: 400, headers: corsHeaders });

    const { data: criteriaData } = await supabase.from("recruitment_agent_criteria")
      .select("*").eq("agent_id", agentId).order("weight", { ascending: false });
    if (!criteriaData?.length) return new Response(JSON.stringify({ error: "no criteria" }), { status: 400, headers: corsHeaders });

    const agentCriteria = criteriaData.map((c: any) => ({
      id: c.id, name: c.name, description: c.description || "",
      excellenceDescription: c.excellence_description || "",
      warningSignsDescription: c.warning_signs_description || "",
      minimumScore: c.minimum_score ?? 5, importance: c.importance, weight: c.weight ?? 1,
    }));

    // Culture context
    const cultureContext: any = { mission: "", vision: "", values: [] };
    const { data: company } = await supabase.from("companies").select("current_mission, current_vision").eq("id", accountId).maybeSingle();
    if (company) { cultureContext.mission = company.current_mission || ""; cultureContext.vision = company.current_vision || ""; }
    const { data: values } = await supabase.from("culture_values").select("*").eq("account_id", accountId).eq("active", true);
    if (values) cultureContext.values = values.map((v: any) => ({ label: v.label, dos: v.dos || [], donts: v.donts || [] }));

    // Job context
    let jobContext: any = null;
    const { data: job } = await supabase.from("recruitment_jobs")
      .select("title, mission, behavioral_competencies").eq("id", session.job_id).maybeSingle();
    if (job) jobContext = { title: job.title, mission: job.mission || "", behavioralCompetencies: job.behavioral_competencies || [] };

    let sellingContent = "";
    const { data: evp } = await supabase.from("selling_page_versions")
      .select("content").eq("account_id", accountId).eq("status", "approved")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (evp?.content) sellingContent = evp.content;

    // Call AI with V1 prompt
    const userPrompt = buildPromptV1(responses, agentCriteria, cultureContext, jobContext, sellingContent);
    const model = requestedModel || "google/gemini-2.5-pro";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: EVALUATION_SYSTEM_PROMPT_V1 },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: "ai_failed", status: aiRes.status, body: txt }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const aiData = await aiRes.json();
    const aiText = aiData.choices?.[0]?.message?.content || "";
    let parsed: any = { criteriaEvaluations: [] };
    try {
      let txt = aiText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      const m = txt.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    } catch (e) {
      return new Response(JSON.stringify({ error: "parse_failed", raw: aiText.substring(0, 1000) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // V1 scoring: simple weighted avg, simple recommendation
    const legacyResult = calculateFinalScoreLegacy(parsed.criteriaEvaluations || [], agentCriteria);

    // V1-style recommendation: >=70 RECOMENDADO, 50-69 RESSALVAS, <50 NÃO
    const score = legacyResult.finalScore;
    let recommendationV1: string;
    if (score >= 70 && legacyResult.failedCriteria.length === 0) recommendationV1 = "RECOMENDADO";
    else if (score >= 50) recommendationV1 = "RECOMENDADO_COM_RESSALVAS";
    else recommendationV1 = "NAO_RECOMENDADO";

    // Comparison with current V2 in DB
    const v2CurrentScore = session.matching_score;

    return new Response(JSON.stringify({
      success: true,
      model,
      sessionId,
      v1: {
        finalScore: score,
        recommendation: recommendationV1,
        recommendationLegacy: legacyResult.recommendation,
        failedCriteria: legacyResult.failedCriteria,
        breakdown: (parsed.criteriaEvaluations || []).map((ev: any) => ({
          criterion: ev.criterionName,
          score: ev.score,
          alignment: ev.alignmentLevel,
          justification: ev.justification,
        })),
        overallSummary: parsed.overallSummary || "",
        strengths: parsed.candidateStrengths || [],
        concerns: parsed.candidateConcerns || [],
      },
      v2Current: {
        finalScore: v2CurrentScore,
      },
      delta: typeof v2CurrentScore === "number" ? +(score - v2CurrentScore).toFixed(1) : null,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
