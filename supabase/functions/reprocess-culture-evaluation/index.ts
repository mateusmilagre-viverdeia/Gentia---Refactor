import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';
import { getConfiguredModel } from '../_shared/ai-model-config.ts';
import {
  calculateFinalScoreLegacy,
  loadShadowConfig,
  type StrictnessProfile,
} from '../_shared/culture-evaluation-v2.ts';
import {
  EVALUATION_SYSTEM_PROMPT_V4,
  calculateFinalScoreV4,
} from '../_shared/culture-evaluation-v4.ts';
import { computeInterviewDuration } from '../_shared/computeInterviewDuration.ts';
import { resolvePrompt } from '../_shared/aiPrompts.ts';
import { callLLMTool } from '../_shared/llm-tool-call.ts';

const log = createLogger('reprocess-culture-evaluation');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types (same as culture-interview-complete)
interface AgentCriterion {
  id: string;
  name: string;
  description: string;
  excellenceDescription: string;
  warningSignsDescription: string;
  minimumScore: number;
  importance: "minor" | "moderate" | "important" | "very_important" | "critical";
  weight: number;
  color: string;
}

interface CriterionEvaluationAI {
  criterionId: string;
  criterionName: string;
  score: number;
  justification: string;
  alignmentLevel: 'Baixo' | 'Moderado' | 'Forte';
  positiveEvidence: Array<{ questionIndex: number; quote: string; analysis: string }>;
  negativeEvidence: Array<{ questionIndex: number; quote: string; analysis: string }>;
  questionsUsed: number[];
}

interface AIEvaluationResponse {
  criteriaEvaluations: CriterionEvaluationAI[];
  overallSummary: string;
  candidateStrengths: string[];
  candidateConcerns: string[];
}

const IMPORTANCE_MULTIPLIERS: Record<string, number> = {
  minor: 1, moderate: 2, important: 3, very_important: 4, critical: 5,
};

const IMPORTANCE_LABELS: Record<string, string> = {
  minor: "Pouco Importante (x1)", moderate: "Moderado (x2)", important: "Importante (x3)",
  very_important: "Muito Importante (x4)", critical: "Crítico (x5)",
};

const EVALUATION_SYSTEM_PROMPT = `Você é um especialista sênior em avaliação de fit cultural e RH comportamental.

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

function buildEvaluationPrompt(
  responses: any[],
  criteria: AgentCriterion[],
  cultureContext: any,
  jobContext: any,
  sellingContent: string,
): string {
  return `
## CONTEXTO DA EMPRESA

Missão: ${cultureContext.mission || 'Não informada'}
Visão: ${cultureContext.vision || 'Não informada'}

Valores e Comportamentos:
${cultureContext.values?.length > 0 
  ? cultureContext.values.map((v: any) => `- **${v.label}**: Fazemos (${v.dos?.join('; ')}), Não fazemos (${v.donts?.join('; ')})`).join('\n')
  : 'Não informados'}

${sellingContent ? `
Proposta de Valor da Empresa (EVP):
${sellingContent.substring(0, 2000)}
` : ''}

${jobContext ? `
## VAGA

Cargo: ${jobContext.title}
Missão: ${jobContext.mission || 'Não informada'}
Competências Comportamentais: ${jobContext.behavioralCompetencies?.join(', ') || 'Não informadas'}
` : ''}

## CRITÉRIOS DE AVALIAÇÃO (${criteria.length} critérios)

${criteria.map((c, i) => `
### ${i + 1}. ${c.name} (ID: ${c.id})
- **Descrição:** ${c.description}
- **Sinais de EXCELÊNCIA:** ${c.excellenceDescription || 'Não especificado'}
- **Sinais de ALERTA:** ${c.warningSignsDescription || 'Não especificado'}
- **Nota Mínima de Corte:** ${c.minimumScore * 10}% 
- **Importância:** ${IMPORTANCE_LABELS[c.importance]}
- **Peso:** ${c.weight}
`).join('\n')}

## TRANSCRIÇÃO DA ENTREVISTA (${responses.length} perguntas/respostas)

${responses.map((r: any, i: number) => `
[P${i}] ${r.question_text || r.questionText || ''}
[R${i}] "${r.candidate_response || r.candidateResponse || ''}"
`).join('\n---\n')}

## INSTRUÇÕES DE AVALIAÇÃO

Avalie o candidato em CADA um dos ${criteria.length} critérios listados acima.

Responda APENAS em JSON válido conforme o schema:
{
  "criteriaEvaluations": [
    {
      "criterionId": "<UUID do critério>",
      "criterionName": "<nome do critério>",
      "score": <0.0 a 100.0>,
      "justification": "<2-4 frases com citações diretas do candidato>",
      "alignmentLevel": "<Baixo|Moderado|Forte>",
      "positiveEvidence": [{ "questionIndex": <num>, "quote": "<citação>", "analysis": "<análise>" }],
      "negativeEvidence": [{ "questionIndex": <num>, "quote": "<citação>", "analysis": "<análise>" }],
      "questionsUsed": [<índices>]
    }
  ],
  "overallSummary": "<síntese qualitativa em 2-3 parágrafos>",
  "candidateStrengths": ["<ponto forte 1>"],
  "candidateConcerns": ["<preocupação 1>"]
}`;
}

function calculateFinalScore(
  criteriaEvaluations: CriterionEvaluationAI[],
  agentCriteria: AgentCriterion[]
) {
  let weightedSum = 0;
  let totalWeight = 0;
  const failedCriteria: Array<{ name: string; score: number; minimum: number; importance: string }> = [];
  const criteriaWithImpact: Array<any> = [];

  for (const evaluation of criteriaEvaluations) {
    const criterion = agentCriteria.find(c => c.id === evaluation.criterionId);
    if (!criterion) continue;

    const multiplier = IMPORTANCE_MULTIPLIERS[criterion.importance] || 1;
    const weight = criterion.weight || 1;
    const effectiveWeight = weight * multiplier;

    weightedSum += evaluation.score * effectiveWeight;
    totalWeight += effectiveWeight;

    const minimumPercent = (criterion.minimumScore || 5) * 10;
    const passed = evaluation.score >= minimumPercent;

    if (!passed) {
      failedCriteria.push({ name: criterion.name, score: evaluation.score, minimum: minimumPercent, importance: criterion.importance });
    }

    criteriaWithImpact.push({
      criterionId: criterion.id, criterionName: criterion.name, score: evaluation.score,
      weight, multiplier, effectiveWeight, impactPercentage: 0, minimumPercent, passed, importance: criterion.importance,
    });
  }

  if (totalWeight > 0) {
    for (const c of criteriaWithImpact) { c.impactPercentage = (c.effectiveWeight / totalWeight) * 100; }
  }

  const finalScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;

  const criticalFailed = failedCriteria.filter(f => f.importance === 'critical' || f.importance === 'very_important');
  let recommendation: string;
  if (finalScore >= 75 && failedCriteria.length === 0) recommendation = "RECOMENDADO";
  else if (finalScore >= 50 && criticalFailed.length === 0) recommendation = "RECOMENDADO_COM_RESSALVAS";
  else recommendation = "NAO_RECOMENDADO";

  return { finalScore, recommendation, failedCriteria, criteriaWithImpact };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Desacoplado: a avaliação real roda por callLLMTool (wrapper força direto no destino).
    // Guard antigo virou dead-code e quebrava no destino (LOVABLE_API_KEY removido).
    const LOVABLE_API_KEY = "direct";
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseServiceKey;
    
    const body = await req.json();
    const { sessionId, _adminBypass } = body;
    const isAdminBypass = _adminBypass === supabaseServiceKey || req.headers.get("x-admin-bypass") === "true";

    if (!isServiceRole && !isAdminBypass) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      (body as any)._user = user;
    }

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    log.log(`🔄 Reprocessing session: ${sessionId}`);

    // Load session
    const { data: session, error: sessionError } = await supabase
      .from("culture_interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const accountId = session.account_id;

    // Permission check (skip for service role / admin bypass)
    if (!isServiceRole && !isAdminBypass) {
      const user = (body as any)._user;

      // Allow: account owner/admin/admin_rh, super admin, or consultant with edit access to client project
      const [{ data: membership }, { data: superAdmin }, { data: canEdit }] = await Promise.all([
        supabase
          .from("account_members")
          .select("role")
          .eq("user_id", user.id)
          .eq("account_id", accountId)
          .maybeSingle(),
        supabase.rpc("is_super_admin", { _user_id: user.id }),
        supabase.rpc("can_edit_client_project", { _user_id: user.id, _account_id: accountId }),
      ]);

      const hasAccountRole = !!membership && ["owner", "admin", "admin_rh"].includes(membership.role);
      const allowed = hasAccountRole || superAdmin === true || canEdit === true;

      if (!allowed) {
        log.log(`⛔ Permission denied for user ${user.id} on account ${accountId}`, { hasAccountRole, superAdmin, canEdit });
        return new Response(JSON.stringify({
          error: "permission_denied",
          message: "Você não tem permissão para reprocessar esta avaliação.",
        }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Load responses
    const { data: responses } = await supabase
      .from("culture_interview_responses")
      .select("*")
      .eq("session_id", sessionId)
      .order("question_index", { ascending: true });

    if (!responses || responses.length === 0) {
      return new Response(JSON.stringify({ error: "No responses found for this session" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    log.log(`📝 Found ${responses.length} responses`);

    // Resolve agent with 4-level fallback
    let agentId: string | null = session.agent_id || null;
    
    if (!agentId) {
      const { data: job } = await supabase.from('recruitment_jobs').select('agent_id').eq('id', session.job_id).maybeSingle();
      agentId = job?.agent_id || null;
    }
    if (!agentId) {
      const { data: step } = await supabase.from('recruitment_job_workflow_steps').select('agent_id').eq('job_id', session.job_id).eq('step_type', 'cultural').eq('is_active', true).not('agent_id', 'is', null).order('position', { ascending: true }).limit(1).maybeSingle();
      agentId = step?.agent_id || null;
    }
    if (!agentId) {
      const { data: agent } = await supabase.from('recruitment_agents').select('id').eq('account_id', accountId).in('type', ['cultural', 'structured']).eq('is_active', true).limit(1).maybeSingle();
      agentId = agent?.id || null;
    }

    if (!agentId) {
      return new Response(JSON.stringify({ error: "No cultural agent found for this account" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    log.log(`✅ Agent resolved: ${agentId}`);

    // Load agent criteria
    let overallMinimumScore = 7.0;
    let strictnessProfile: StrictnessProfile = "standard";
    const { data: agentSettings } = await supabase.from('recruitment_agents').select('minimum_score, strictness_profile').eq('id', agentId).maybeSingle();
    if (agentSettings?.minimum_score != null) {
      const parsed = typeof agentSettings.minimum_score === 'number' ? agentSettings.minimum_score : parseFloat(String(agentSettings.minimum_score));
      if (!Number.isNaN(parsed)) overallMinimumScore = Math.round(Math.min(10, Math.max(0, parsed)) * 10) / 10;
    }
    const sp = (agentSettings as any)?.strictness_profile;
    if (sp === 'lenient' || sp === 'standard' || sp === 'strict') strictnessProfile = sp;

    const { data: criteriaData } = await supabase.from('recruitment_agent_criteria').select('*').eq('agent_id', agentId).order('weight', { ascending: false });
    if (!criteriaData || criteriaData.length === 0) {
      return new Response(JSON.stringify({ error: "No criteria configured for this agent" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load total script questions count for Dilution Ceiling (V4)
    const { count: totalScriptQuestionsCount } = await supabase
      .from('recruitment_agent_questions')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('is_active', true);

    const agentCriteria: AgentCriterion[] = criteriaData.map(c => ({
      id: c.id, name: c.name, description: c.description || '', excellenceDescription: c.excellence_description || '',
      warningSignsDescription: c.warning_signs_description || '', minimumScore: c.minimum_score ?? 5,
      importance: c.importance as AgentCriterion["importance"], weight: c.weight ?? 1, color: c.color || 'gray',
    }));

    log.log(`✅ Loaded ${agentCriteria.length} criteria; script has ${totalScriptQuestionsCount || 0} questions`);

    // Load culture context
    let cultureContext = { mission: '', vision: '', values: [] as any[] };
    try {
      const { data: company } = await supabase.from('companies').select('current_mission, current_vision').eq('id', accountId).maybeSingle();
      if (company) {
        cultureContext.mission = company.current_mission || '';
        cultureContext.vision = company.current_vision || '';
      }
      const { data: values } = await supabase.from('culture_values').select('*').eq('account_id', accountId).eq('active', true);
      if (values) {
        cultureContext.values = values.map((v: any) => ({ label: v.label, dos: v.dos || [], donts: v.donts || [] }));
      }
    } catch (e) { log.error("⚠️ Error loading culture context:", e); }

    // Load job context
    let jobContext: any = null;
    try {
      const { data: job } = await supabase.from('recruitment_jobs').select('title, mission, responsibilities, required_skills, desired_skills, behavioral_competencies').eq('id', session.job_id).maybeSingle();
      if (job) {
        jobContext = {
          title: job.title, mission: job.mission || '',
          responsibilities: job.responsibilities || [], requiredSkills: job.required_skills || [],
          desiredSkills: job.desired_skills || [], behavioralCompetencies: job.behavioral_competencies || [],
        };
      }
    } catch (e) { log.error("⚠️ Error loading job context:", e); }

    // Load EVP
    let sellingContent = '';
    try {
      const { data: evp } = await supabase.from('selling_page_versions').select('content').eq('account_id', accountId).eq('status', 'approved').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (evp?.content) sellingContent = evp.content;
    } catch (e) { log.error("⚠️ Error loading EVP:", e); }

    // Build prompt and call AI
    log.log("🤖 Calling AI for qualitative evaluation...");
    const evaluationPrompt = buildEvaluationPrompt(responses, agentCriteria, cultureContext, jobContext, sellingContent);

    const PRIMARY_MODEL = await getConfiguredModel("reprocess-culture-evaluation", "google/gemini-2.5-flash");

    // Track AI usage + model actually used for cost/credit accounting after evaluation
    let lastEvalUsage: { prompt_tokens: number; completion_tokens: number } = { prompt_tokens: 0, completion_tokens: 0 };
    let lastEvalModel: string = PRIMARY_MODEL;

    const callEvaluator = async (model: string) => {
      const baseSystemPrompt = EVALUATION_SYSTEM_PROMPT_V4;
      const systemPrompt = await resolvePrompt('culture_evaluation_system_v4', {}, baseSystemPrompt);

      const CULTURE_TOOL_SCHEMA = {
        type: "object",
        properties: {
          criteriaEvaluations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                criterionId: { type: "string" },
                criterionName: { type: "string" },
                score: { type: "number" },
                justification: { type: "string" },
                alignmentLevel: { type: "string", enum: ["Baixo", "Moderado", "Forte"] },
                positiveEvidence: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      questionIndex: { type: "number" },
                      quote: { type: "string" },
                      analysis: { type: "string" },
                    },
                    required: ["questionIndex", "quote", "analysis"],
                  },
                },
                negativeEvidence: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      questionIndex: { type: "number" },
                      quote: { type: "string" },
                      analysis: { type: "string" },
                    },
                    required: ["questionIndex", "quote", "analysis"],
                  },
                },
                questionsUsed: { type: "array", items: { type: "number" } },
                evidenceCount: { type: "number" },
                redFlagsDetected: { type: "array", items: { type: "string" } },
                genericResponseDetected: { type: "boolean" },
                confidenceLevel: { type: "string", enum: ["low", "medium", "high"] },
              },
              required: ["criterionId", "criterionName", "score", "justification", "alignmentLevel", "positiveEvidence", "negativeEvidence", "questionsUsed", "evidenceCount", "redFlagsDetected", "genericResponseDetected", "confidenceLevel"],
            },
          },
          overallSummary: { type: "string" },
          candidateStrengths: { type: "array", items: { type: "string" } },
          candidateConcerns: { type: "array", items: { type: "string" } },
        },
        required: ["criteriaEvaluations", "overallSummary", "candidateStrengths", "candidateConcerns"],
      } as const;

      const { args, usage } = await callLLMTool<any>({
        model,
        systemPrompt,
        userPrompt: evaluationPrompt,
        tool: {
          name: "submit_culture_evaluation",
          description: "Devolve a avaliação cultural completa do candidato.",
          parameters: CULTURE_TOOL_SCHEMA,
        },
        maxTokens: 2500,
      });

      lastEvalUsage = {
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
      };
      lastEvalModel = model;

      return {
        criteriaEvaluations: args.criteriaEvaluations || [],
        overallSummary: args.overallSummary || "",
        candidateStrengths: args.candidateStrengths || [],
        candidateConcerns: args.candidateConcerns || [],
      } as AIEvaluationResponse;
    };

    let aiEvaluation: AIEvaluationResponse;
    try {
      aiEvaluation = await callEvaluator(PRIMARY_MODEL);
    } catch (e) {
      log.error(`❌ Evaluation failed:`, e);
      return new Response(JSON.stringify({
        success: false,
        evaluationFailed: true,
        message: `Avaliação automática falhou: ${e instanceof Error ? e.message : String(e)}`,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (aiEvaluation.criteriaEvaluations.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        evaluationFailed: true,
        message: "Avaliação automática falhou em ambos os modelos. Tente novamente em alguns minutos.",
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    log.log(`✅ AI evaluation: ${aiEvaluation.criteriaEvaluations.length} criteria evaluated`);

    // Calculate score (legacy + V2 in parallel for shadow mode)
    const shadowConfig = await loadShadowConfig(supabase);
    const v2Input = aiEvaluation.criteriaEvaluations as any[];
    const agentForScoring = agentCriteria.map(c => ({
      id: c.id, name: c.name, description: c.description,
      excellenceDescription: c.excellenceDescription,
      warningSignsDescription: c.warningSignsDescription,
      minimumScore: c.minimumScore, importance: c.importance as any, weight: c.weight,
    }));
    const legacyResult = calculateFinalScoreLegacy(v2Input as any, agentForScoring);
    const v4Result = calculateFinalScoreV4({
      evaluations: v2Input as any,
      agentCriteria: agentForScoring,
      durationSeconds: session.duration_seconds || session.audio_duration_seconds,
      responsesCount: responses.length,
      totalScriptQuestionsCount: totalScriptQuestionsCount || 1,
      strictnessProfile,
    });

    const scoringResult: any = {
      finalScore: v4Result.finalScore,
      recommendation: v4Result.recommendation,
      failedCriteria: v4Result.failedCriteria,
      criteriaWithImpact: v4Result.criteriaWithImpact,
    };

    const belowOverallMinimum = scoringResult.finalScore < (overallMinimumScore * 10);
    if (belowOverallMinimum) scoringResult.recommendation = "NAO_RECOMENDADO";
    log.log(`✅ Final: ${scoringResult.finalScore.toFixed(1)}% (V4); legacy=${legacyResult.finalScore.toFixed(1)}%`);

    // Delete old criteria evaluations
    await supabase.from('culture_interview_criteria_evaluations').delete().eq('session_id', sessionId);

    // Insert new criteria evaluations
    const parsedResponses = responses.map((r: any) => ({
      questionText: r.question_text,
      aiQuestionSpoken: r.ai_question_spoken,
      candidateResponse: r.candidate_response,
      valueLabel: r.value_label,
    }));

    // Dedupe evidences within a criterion (defensive against AI repetitions).
    const dedupeEvidenceList = (list: any[] | undefined) => {
      if (!Array.isArray(list)) return list;
      const seen = new Set<string>();
      const out: any[] = [];
      for (const e of list) {
        const key = `${e?.questionIndex ?? '?'}::${(e?.quote || '').trim().toLowerCase()}::${(e?.analysis || '').trim().toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(e);
      }
      return out;
    };

    const evaluationsToInsert = aiEvaluation.criteriaEvaluations.map((ev: any) => {
      const criteriaImpact = scoringResult.criteriaWithImpact.find((c: any) => c.criterionId === ev.criterionId);
      const v2Impact = v4Result.criteriaWithImpact.find(c => c.criterionId === ev.criterionId);
      return {
        session_id: sessionId, criterion_id: ev.criterionId, criterion_name: ev.criterionName,
        score: ev.score, minimum_score_percent: criteriaImpact?.minimumPercent || 50,
        justification: ev.justification, alignment_level: ev.alignmentLevel,
        positive_evidence: dedupeEvidenceList(ev.positiveEvidence), negative_evidence: dedupeEvidenceList(ev.negativeEvidence),
        questions_used: ev.questionsUsed?.map((qi: number) => {
          const dPos = dedupeEvidenceList(ev.positiveEvidence) as any[] | undefined;
          const dNeg = dedupeEvidenceList(ev.negativeEvidence) as any[] | undefined;
          const evidenceQuotes = [...(dPos || []), ...(dNeg || [])]
            .filter((e) => e?.questionIndex === qi && (e?.quote || '').trim())
            .map((e) => e.quote.trim());
          return { number: qi, question: parsedResponses[qi]?.aiQuestionSpoken || parsedResponses[qi]?.questionText || '', answer: parsedResponses[qi]?.candidateResponse || '', evidenceQuotes };
        }) || [],
        importance: criteriaImpact?.importance || 'moderate', weight: criteriaImpact?.weight || 1,
        weight_multiplier: criteriaImpact?.multiplier || 1, impact_percentage: criteriaImpact?.impactPercentage || 0,
        passed_minimum: criteriaImpact?.passed || false,
        evidence_count: ev.evidenceCount ?? null,
        red_flags: ev.redFlagsDetected ?? [],
        confidence_level: ev.confidenceLevel ?? null,
        generic_response_detected: !!ev.genericResponseDetected,
        base_score: ev.score,
        penalty_applied: v2Impact?.penaltyApplied ?? 0,
        legacy_score: ev.score,
      };
    });

    await supabase.from('culture_interview_criteria_evaluations').insert(evaluationsToInsert);

    // Build analysis text
    let fullAnalysis = aiEvaluation.overallSummary;
    if (scoringResult.failedCriteria.length > 0) {
      fullAnalysis += `\n\n## ⚠️ Critérios Abaixo do Mínimo:\n`;
      for (const fc of scoringResult.failedCriteria) fullAnalysis += `- **${fc.name}** (${fc.importance}): ${fc.score.toFixed(1)}% < ${fc.minimum}% mínimo\n`;
    }
    fullAnalysis += "\n\n## Avaliação por Pilar:\n";
    for (const ev of aiEvaluation.criteriaEvaluations) fullAnalysis += `**${ev.criterionName}** (${ev.alignmentLevel} - ${ev.score.toFixed(1)}%): ${ev.justification}\n\n`;
    if (aiEvaluation.candidateStrengths.length > 0) fullAnalysis += "\n## Pontos Fortes:\n" + aiEvaluation.candidateStrengths.map(s => `- ${s}`).join('\n');
    if (aiEvaluation.candidateConcerns.length > 0) fullAnalysis += "\n\n## Pontos de Atenção:\n" + aiEvaluation.candidateConcerns.map(c => `- ${c}`).join('\n');

    // Build radar data
    const candidateRadarData = {
      pillars: agentCriteria.map(c => c.name),
      scores: agentCriteria.map(c => { const ev = aiEvaluation.criteriaEvaluations.find(e => e.criterionId === c.id); return ev?.score || 0; }),
    };
    const companyRadarData = { pillars: candidateRadarData.pillars, scores: agentCriteria.map(c => c.minimumScore * 10) };

    // Build aligned/misaligned with dedupe across criteria.
    const allEvidence: Array<{ type: string; ev: any; criterion: string }> = [];
    for (const ev of aiEvaluation.criteriaEvaluations) {
      for (const pe of ev.positiveEvidence || []) allEvidence.push({ type: 'positive', ev: pe, criterion: ev.criterionName });
      for (const ne of ev.negativeEvidence || []) allEvidence.push({ type: 'negative', ev: ne, criterion: ev.criterionName });
    }
    const dedupeCross = (items: typeof allEvidence) => {
      const map = new Map<string, { ev: any; criterions: string[] }>();
      for (const it of items) {
        const analysis = (it.ev?.analysis || '').trim();
        const key = `${it.ev?.questionIndex ?? '?'}::${analysis.toLowerCase()}`;
        const ex = map.get(key);
        if (ex) {
          if (!ex.criterions.includes(it.criterion)) ex.criterions.push(it.criterion);
        } else {
          map.set(key, { ev: it.ev, criterions: [it.criterion] });
        }
      }
      return Array.from(map.values());
    };
    const mappedAligned = dedupeCross(allEvidence.filter(e => e.type === 'positive')).slice(0, 5).map(({ ev, criterions }) => {
      const r = parsedResponses[ev.questionIndex];
      return { questionIndex: ev.questionIndex, questionText: r?.questionText || '', candidateResponse: r?.candidateResponse || ev.quote, reason: `[${criterions.join(', ')}] ${ev.analysis}`, valueLabel: r?.valueLabel || null };
    });
    const mappedMisaligned = dedupeCross(allEvidence.filter(e => e.type === 'negative')).slice(0, 5).map(({ ev, criterions }) => {
      const r = parsedResponses[ev.questionIndex];
      return { questionIndex: ev.questionIndex, questionText: r?.questionText || '', candidateResponse: r?.candidateResponse || ev.quote, reason: `[${criterions.join(', ')}] ${ev.analysis}`, valueLabel: r?.valueLabel || null };
    });

    // Recompute duration honestly (no token usage on reprocess path; falls back
    // to last_activity_at − started_at so watchdog-closed sessions don't show
    // inflated values).
    const recomputedDuration = computeInterviewDuration({
      tokenUsage: null,
      lastActivityAt: session.last_activity_at,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      clientDurationSeconds: session.duration_seconds,
    });

    // Update session
    const { error: updateError } = await supabase
      .from("culture_interview_sessions")
      .update({
        matching_score: scoringResult.finalScore,
        recommendation: scoringResult.recommendation,
        matching_analysis: fullAnalysis,
        duration_seconds: recomputedDuration ?? session.duration_seconds,
        aligned_responses: mappedAligned,
        misaligned_responses: mappedMisaligned,
        candidate_radar_data: candidateRadarData,
        company_radar_data: companyRadarData,
        legacy_score: legacyResult.finalScore,
        legacy_recommendation: legacyResult.recommendation,
        evidence_floor_passed: v4Result.evidenceFloorPassed,
        red_flags_count: v4Result.redFlagsCount,
        avg_confidence_level: v4Result.avg_confidence_level, // note: v4 uses the same field name internally but I'll fix the property access if needed
        evaluation_audit_trail: {
          version: 'v4',
          strictness_profile: strictnessProfile,
          shadow_enabled: shadowConfig.shadowEnabled,
          reprocessed_at: new Date().toISOString(),
          legacy: { score: legacyResult.finalScore, recommendation: legacyResult.recommendation, failed_criteria: legacyResult.failedCriteria },
          v4: {
            score: v4Result.finalScore, recommendation: v4Result.recommendation,
            failed_criteria: v4Result.failedCriteria, audit_trail: v4Result.auditTrail,
            avg_evidence_count: v4Result.avgEvidenceCount,
            evidence_floor_passed: v4Result.evidenceFloorPassed,
            red_flags_count: v4Result.redFlagsCount,
            avg_confidence_level: v4Result.avgConfidenceLevel,
            ceilings_applied: v4Result.ceilingsApplied,
          },
          diff: {
            score_delta: Math.round((v4Result.finalScore - legacyResult.finalScore) * 10) / 10,
            recommendation_changed: v4Result.recommendation !== legacyResult.recommendation,
          },
        },
      })
      .eq("id", sessionId);

    if (updateError) throw new Error(`Failed to update session: ${updateError.message}`);

    // Sync archived attempt history (used by unified interviews list)
    await supabase
      .from("interview_attempt_history")
      .update({ score: scoringResult.finalScore })
      .eq("original_session_id", sessionId)
      .eq("session_type", "cultural");

    log.log(`✅ Session reprocessed: ${scoringResult.finalScore.toFixed(1)}%`);

    // ========================
    // TOKEN USAGE + CONSUME CREDITS (idempotente) — quando o watchdog fecha a sessão,
    // o caminho normal não roda, então cobramos aqui.
    // ========================
    try {
      // Idempotência: se já existe débito para esta sessão, pula.
      const { count: alreadyLogged } = await supabase
        .from("recruitment_usage_log")
        .select("id", { count: "exact", head: true })
        .eq("reference_id", sessionId)
        .eq("reference_type", "culture_interview");

      if (!alreadyLogged || alreadyLogged === 0) {
        // === NOVO MODELO: preço de tabela por minuto ===
        // Cobra `culture_interview_realtime` (0,35 cr/min por padrão) × duração em minutos.
        // A avaliação LLM final já está embutida nesse preço — não cobramos separadamente.
        
        // GUARD-RAILS de cobrança (defesa em profundidade contra duração corrompida).
        // - Preferir SEMPRE recomputedDuration (calculada honestamente acima a partir
        //   de last_activity_at − started_at), não o valor stale do registro.
        // - Cross-check: se o valor do registro for > 2× o recomputado, usar o recomputado.
        // - Cap absoluto: nunca cobrar > 60 min em uma única chamada (entrevistas reais
        //   nunca passam disso; valores acima indicam bug).
        // - Floor: < 10s = ruído, não cobra.
        const MAX_DURATION_SECS = 60 * 60;     // 60 min
        const MIN_DURATION_SECS = 10;
        const stored = Number(session.duration_seconds || 0);
        const recomputed = Number(recomputedDuration || 0);
        let durationSecs = recomputed > 0 ? recomputed : stored;
        let durationSource: "recomputed" | "stored" | "capped" | "cross_check" = recomputed > 0 ? "recomputed" : "stored";
        if (stored > 0 && recomputed > 0 && stored > recomputed * 2) {
          log.log(`⚠️ [billing-guard] stored duration ${stored}s > 2× recomputed ${recomputed}s — using recomputed`);
          durationSecs = recomputed;
          durationSource = "cross_check";
        }
        if (durationSecs > MAX_DURATION_SECS) {
          log.error(`🛑 [billing-guard] duration ${durationSecs}s > cap ${MAX_DURATION_SECS}s — capping`);
          durationSecs = MAX_DURATION_SECS;
          durationSource = "capped";
        }
        if (durationSecs < MIN_DURATION_SECS) {
          log.log(`⏭️ [billing-guard] duration ${durationSecs}s < floor ${MIN_DURATION_SECS}s — skipping charge`);
          // grava trilha para auditoria mas não cobra
          await supabase.from("culture_interview_sessions").update({
            metadata: { ...(session.metadata || {}), billing_skipped_reason: "duration_under_floor", billing_duration_source: durationSource },
          }).eq("id", sessionId);
          return;
        }

        const minutes = Math.max(durationSecs / 60, 0);
        
        // Importante: reprocess-culture-evaluation precisa importar consumeAICredits se não tiver.
        // No momento ele não tem o import no topo, vou adicionar no próximo passo.
        // Mas o código de cobrança deve ser:
        const { consumeAICredits } = await import("../_shared/ai-credit-consumption.ts");
        
        log.log(`💳 [reprocess] Consuming credits via table price (${minutes.toFixed(1)}min, source=${durationSource})`);

        const creditResult = await consumeAICredits({
          supabase,
          accountId,
          featureKey: 'culture_interview_realtime',
          quantity: minutes,
          referenceId: sessionId,
          referenceType: 'culture_interview',
          description: `Entrevista cultural (watchdog) - ${Math.ceil(minutes)}min (preço de tabela)`,
          userId: null,
        });

        if (creditResult.success) {
          log.log(`💳 Credits consumed: ${creditResult.creditsConsumed}`);
          // Marca sessão como cobrada (trava anti-cobrança-duplicada)
          await supabase
            .from('culture_interview_sessions')
            .update({ credits_consumed_at: new Date().toISOString() })
            .eq('id', sessionId);
        } else {
          log.log(`⚠️ Credit consumption failed/skipped: ${creditResult.error}`);
        }

      } else {
        log.log(`💳 Already billed (${alreadyLogged} entries) — skipping consume.`);
      }
    } catch (billErr) {
      log.error("⚠️ Failed to bill in reprocess:", billErr);
    }


    // Log audit event
    if (session.candidate_id) {
      const auditUser = (body as any)._user;
      await supabase.from("candidate_tracking_events").insert([{
        account_id: accountId,
        candidate_id: session.candidate_id,
        job_id: session.job_id || null,
        event_type: "culture_evaluation_reprocessed",
        metadata: {
          session_id: sessionId,
          new_score: scoringResult.finalScore,
          reprocessed_by: auditUser?.id ?? (isServiceRole || isAdminBypass ? "service_role" : null),
        },
      }]);
    }

    // ─── Trigger orchestrator so the candidate auto-advances or is auto-disqualified ───
    // Important for the watchdog flow, where this function is the only path completing the session.
    try {
      log.log("🎯 Calling recruitment-orchestrator after reprocess...");
      await supabase.functions.invoke("recruitment-orchestrator", {
        body: {
          candidateId: session.candidate_id, // may be null — orchestrator resolves via sessionId
          jobId: session.job_id,
          accountId,
          completedStepType: "cultural",
          sessionId,
          completedNaturally: false,
          attemptNumber: session.attempt_number || 1,
        },
      });
    } catch (orchErr) {
      log.error("⚠️ Failed to call orchestrator (non-fatal):", orchErr);
    }

    return new Response(JSON.stringify({
      success: true,
      score: scoringResult.finalScore,
      recommendation: scoringResult.recommendation,
      criteriaCount: aiEvaluation.criteriaEvaluations.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    log.error("❌ Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
