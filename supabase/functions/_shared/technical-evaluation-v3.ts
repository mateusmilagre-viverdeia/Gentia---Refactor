/**
 * Technical Evaluation V3 — versão BALANCEADA (menos rígida que V2).
 *
 * Objetivo: trazer a régua de ~80 (V2) para ~55-62, mantendo eliminadores
 * críticos (alucinação, contradição, required muito baixo) intactos.
 *
 * Diferenças vs V2:
 *  A — Persona menos cética; alucinação −10 (era −20); contradição −5 (era −15);
 *      genérica cap 60 (era 45). Hallucination/contradiction ainda forçam not_recommended.
 *  B — Escala mais generosa: basic <40, intermediate 40–59, advanced 60–79, expert 80–100.
 *  C — Required <40 mantém; 2+ required <55 mantém; Camada G vira cap 75 (era not_recommended).
 *  D — Caps mais altos: global 75 (era 65); turnos<2 cap 65 (era 50);
 *      evidenceCount<2 cap 75 (era 69); no_practical_evidence cap 70 (era 60).
 *  J — Ladder: L0=40, L1=65, L2=80, L3=90, L4=100.
 *  Threshold: recommended ≥60 + allRequiredAbove(55); not_recommended se overall<50 ou anyRequired<45.
 *
 * Consumido por: technical-interview-complete
 */

import { callLLMTool } from "./llm-tool-call.ts";

export type SeniorityTarget = "junior" | "pleno" | "senior" | "lead";
export type SkillSeniority = "junior" | "pleno" | "senior" | "specialist";
export type CeilingSignal =
  | "superficial_repeated"
  | "incorrect"
  | "gave_up"
  | "hesitation"
  | "time_limit"
  | null;

export interface TechnicalQuestionInput {
  skill: string;
  skillType: "required" | "desired";
  level: number;
  questionText: string;
  expectedKeywords?: string[];
  excellentAnswerExample?: string | null;
}

export interface SkillEvalV3 {
  skill: string;
  skillType: "required" | "desired";
  rawScore: number;
  finalScore: number;
  level: "basic" | "intermediate" | "advanced" | "expert";
  seniorityAssessed: SkillSeniority;
  maxLevelReached: number;
  maxLevelPassed: number;
  ceilingDetected: boolean;
  ceilingSignal: CeilingSignal;
  evidenceCount: number;
  scenarioHandled: boolean;
  keywordCoverage: number;
  redFlags: string[];
  justification: string;
  evidence: string[];
  capsApplied: string[];
  insufficientEvidence: boolean;
}

export interface TechnicalEvalV3Result {
  skillEvaluations: SkillEvalV3[];
  overallScore: number;
  overallLevel: "basic" | "intermediate" | "advanced" | "expert";
  recommendation: "recommended" | "conditional" | "not_recommended";
  strengths: string[];
  gaps: string[];
  summary: string;
  eliminators: string[];
  seniorityTarget: SeniorityTarget;
  durationSeconds: number;
  candidateTurns: number;
  evaluationVersion: "v3";
}

// =============================================================================
// CAMADA J × A — Tetos suavizados
// =============================================================================
export const LADDER_CAPS: Record<number, number> = {
  0: 40,
  1: 65,
  2: 80,
  3: 90,
  4: 100,
};

export const SENIORITY_BY_LEVEL: Record<number, SkillSeniority> = {
  0: "junior",
  1: "junior",
  2: "pleno",
  3: "senior",
  4: "specialist",
};

// =============================================================================
// CAMADA G — Calibração por senioridade da vaga
// =============================================================================
export const SENIORITY_TARGET_LEVEL: Record<SeniorityTarget, number> = {
  junior: 1,
  pleno: 2,
  senior: 3,
  lead: 4,
};

const SENIORITY_RANK: Record<SkillSeniority, number> = {
  junior: 1,
  pleno: 2,
  senior: 3,
  specialist: 4,
};

// =============================================================================
// PROMPT — Camada A suavizada
// =============================================================================
export function buildEvaluationPrompt(args: {
  jobContext: any;
  seniorityTarget: SeniorityTarget;
  questions: TechnicalQuestionInput[];
  transcript: string;
  durationSeconds: number;
  candidateTurns: number;
  icpTechContext?: string;
}): string {
  const { jobContext, seniorityTarget, questions, transcript, durationSeconds, candidateTurns, icpTechContext } = args;

  const skillsList = [...new Set(questions.map((q) => q.skill))];
  const skillBlocks = skillsList.map((skill) => {
    const skillQs = questions.filter((q) => q.skill === skill).sort((a, b) => a.level - b.level);
    const isRequired = skillQs[0]?.skillType === "required";
    const lines = [`### ${skill} (${isRequired ? "OBRIGATÓRIA" : "Desejável"})`];
    for (const q of skillQs) {
      const degree = ["?", "Júnior", "Pleno", "Sênior", "Specialist"][q.level] || `L${q.level}`;
      lines.push(`- [Degrau ${q.level} · ${degree}] ${q.questionText}`);
      if (q.expectedKeywords && q.expectedKeywords.length > 0) {
        lines.push(`  Keywords esperadas: ${q.expectedKeywords.join(", ")}`);
      }
      if (q.excellentAnswerExample) {
        lines.push(`  Exemplo de resposta excelente: ${q.excellentAnswerExample.slice(0, 240)}`);
      }
    }
    return lines.join("\n");
  }).join("\n\n");

  return `Você é um AVALIADOR TÉCNICO SÊNIOR experiente. Sua função é avaliar de forma JUSTA e EQUILIBRADA se o candidato demonstrou domínio técnico real, valorizando evidências práticas sem ser excessivamente rigoroso.

## POSTURA (Camada A — Equilíbrio)
- Na dúvida ENTRE DOIS NÍVEIS, fique no nível mais baixo APENAS se faltar evidência prática clara.
- Score ≥70 numa skill é apropriado quando há pelo menos 1-2 evidências práticas (exemplos próprios, projetos, decisões técnicas).
- Resposta GENÉRICA sem exemplo próprio → cap 60 nessa skill (ainda permite "intermediate" pleno).
- Alucinação detectada (informação técnica errada com confiança) → −10 e marque red_flag "hallucination".
- Contradição interna entre respostas → −5 e red_flag "contradiction".
- Skill required com score muito baixo → mantenha o número honesto; o sistema decide eliminadores.

## ESCALA RECALIBRADA (Camada B — mais generosa)
- 0–39   = basic        (não demonstrou fundamentos)
- 40–59  = intermediate (fundamentos presentes, profundidade parcial)
- 60–79  = advanced     (domínio prático com evidências)
- 80–100 = expert       (arquitetura, trade-offs e alternativas defendidas)

## ESCADA DE SENIORIDADE POR SKILL (Camada J)
Para cada skill, identifique o DEGRAU MAIS ALTO QUE O CANDIDATO RESPONDEU BEM (correct/excellent):
- Degrau 1 — JÚNIOR    : conceito correto
- Degrau 2 — PLENO     : caso real próprio com exemplo concreto
- Degrau 3 — SÊNIOR    : cenário hipotético resolvido com trade-offs claros
- Degrau 4 — SPECIALIST: arquitetura defendida, alternativas descartadas e justificadas

REGRAS DE TETO (marque o teto quando):
- Resposta superficial repetida após reformulação → ceiling_signal="superficial_repeated"
- Resposta incorreta ou "não sei" → ceiling_signal="incorrect"
- Candidato pediu para pular ou demonstrou desistência → ceiling_signal="gave_up"
- Hesitação prolongada → ceiling_signal="hesitation"
- Sem dado para julgar → ceiling_detected=false e marque "insufficient_evidence" em redFlags

## CONTEXTO DA VAGA
Cargo: ${jobContext?.title || "Não informado"}
Senioridade alvo: ${seniorityTarget.toUpperCase()}
Missão: ${jobContext?.mission || "Não informada"}
Required: ${(jobContext?.requiredSkills || []).join(", ") || "Não informadas"}
Desired:  ${(jobContext?.desiredSkills || []).join(", ") || "Não informadas"}

## ESCADA APLICADA
${skillBlocks}

## METADADOS DA SESSÃO (Camada D)
- Duração: ${durationSeconds}s (${Math.floor(durationSeconds / 60)} min)
- Turnos do candidato: ${candidateTurns}

## TRANSCRIÇÃO
${transcript || "(transcrição não disponível)"}
${icpTechContext || ""}

## SAÍDA
Para CADA skill testada (mesmo que parcialmente):
- rawScore (0-100, antes de tetos)
- maxLevelReached (1-4)
- maxLevelPassed (0-4)
- ceilingDetected + ceilingSignal
- evidenceCount (nº de exemplos práticos próprios citados)
- scenarioHandled (passou no caso hipotético do degrau 3)
- keywordCoverage (0..1)
- redFlags (lista; "hallucination", "contradiction", "insufficient_evidence", "no_practical_evidence", etc.)
- justification curta baseada em evidências
- evidence: 1-3 trechos curtos do candidato

E no nível global:
- strengths, gaps, summary curto.

NÃO calcule recommendation nem aplique tetos — o sistema faz isso depois.`;
}

const TECH_V3_TOOL_SCHEMA = {
  type: "object",
  properties: {
    skillEvaluations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          skill: { type: "string" },
          skillType: { type: "string", enum: ["required", "desired"] },
          rawScore: { type: "number" },
          maxLevelReached: { type: "number" },
          maxLevelPassed: { type: "number" },
          ceilingDetected: { type: "boolean" },
          ceilingSignal: { type: "string" },
          evidenceCount: { type: "number" },
          scenarioHandled: { type: "boolean" },
          keywordCoverage: { type: "number" },
          redFlags: { type: "array", items: { type: "string" } },
          justification: { type: "string" },
          evidence: { type: "array", items: { type: "string" } },
        },
        required: [
          "skill",
          "skillType",
          "rawScore",
          "maxLevelReached",
          "maxLevelPassed",
          "evidenceCount",
          "keywordCoverage",
          "justification",
          "evidence",
        ],
      },
    },
    strengths: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
  required: ["skillEvaluations", "strengths", "gaps", "summary"],
} as const;

// =============================================================================
// PÓS-PROCESSAMENTO DETERMINÍSTICO V3
// =============================================================================
function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function levelFromScore(score: number): "basic" | "intermediate" | "advanced" | "expert" {
  if (score >= 80) return "expert";
  if (score >= 60) return "advanced";
  if (score >= 40) return "intermediate";
  return "basic";
}

export function applyDeterministicRules(
  raw: any,
  args: {
    questions: TechnicalQuestionInput[];
    seniorityTarget: SeniorityTarget;
    durationSeconds: number;
    candidateTurns: number;
  },
): TechnicalEvalV3Result {
  const { seniorityTarget, durationSeconds, candidateTurns, questions } = args;
  const eliminators: string[] = [];

  // -------- Camada D: Evidence floor (caps mais altos) --------
  let globalCap = 100;
  if (durationSeconds < 240) {
    eliminators.push("auto_reject_duration<4min");
    globalCap = 0;
  } else if (durationSeconds < 480 || candidateTurns < 6) {
    globalCap = Math.min(globalCap, 75);
    eliminators.push("evidence_floor_cap_75");
  }

  const skillTurnCount: Record<string, number> = {};
  for (const q of questions) {
    skillTurnCount[q.skill] = (skillTurnCount[q.skill] || 0) + 1;
  }

  const skillEvaluations: SkillEvalV3[] = (raw.skillEvaluations || []).map((s: any): SkillEvalV3 => {
    const capsApplied: string[] = [];
    let score = clamp(Number(s.rawScore) || 0);

    const maxLevelReached = clamp(Number(s.maxLevelReached) || 0, 0, 4);
    const maxLevelPassed = clamp(Number(s.maxLevelPassed) || 0, 0, 4);
    const ceilingSignal: CeilingSignal = (s.ceilingSignal && s.ceilingSignal !== "")
      ? s.ceilingSignal as CeilingSignal
      : null;
    const ceilingDetected = Boolean(s.ceilingDetected) || ceilingSignal !== null;
    const evidenceCount = Math.max(0, Number(s.evidenceCount) || 0);
    const scenarioHandled = Boolean(s.scenarioHandled);
    const keywordCoverage = clamp(Number(s.keywordCoverage) || 0, 0, 1);
    const redFlags: string[] = Array.isArray(s.redFlags) ? s.redFlags : [];
    const skillType = s.skillType === "required" ? "required" : "desired";

    // Camada J × A: teto por degrau alcançado — com bônus de evidência forte
    // Bônus: se há evidências práticas robustas, escapa do teto baixo quando o agente
    // não chegou a fazer pergunta de degrau 3 (comum em skills "desired").
    let ladderCap = LADDER_CAPS[maxLevelPassed] ?? 100;
    if (evidenceCount >= 2 && keywordCoverage >= 0.7 && scenarioHandled) {
      ladderCap = Math.min(90, ladderCap + 10);
      capsApplied.push(`ladder_bonus_strong_evidence(+10,cap=${ladderCap})`);
    }
    if (score > ladderCap) {
      capsApplied.push(`ladder_cap_${SENIORITY_BY_LEVEL[maxLevelPassed]}=${ladderCap}`);
      score = ladderCap;
    }

    // Camada A: cap suavizado se evidência fraca
    if (evidenceCount < 2 && score >= 75) {
      capsApplied.push("anti_leniency_evidence<2_cap_75");
      score = Math.min(score, 75);
    }

    // Camada D: insufficient evidence por skill — cap 65
    // Agora baseado em EVIDÊNCIA REAL (LLM-side), não em # de perguntas planejadas.
    // Skills com qualquer sinal prático (evidence, keywords, scenario) escapam do cap.
    const hasNoEvidenceAtAll =
      evidenceCount < 1 && keywordCoverage < 0.3 && !scenarioHandled;
    let insufficientEvidence = false;
    if (hasNoEvidenceAtAll || redFlags.includes("insufficient_evidence")) {
      insufficientEvidence = true;
      capsApplied.push("insufficient_evidence_cap_65");
      score = Math.min(score, 65);
    }

    // Cap global
    if (score > globalCap) {
      capsApplied.push(`global_cap_${globalCap}`);
      score = globalCap;
    }

    return {
      skill: s.skill,
      skillType,
      rawScore: clamp(Number(s.rawScore) || 0),
      finalScore: score,
      level: levelFromScore(score),
      seniorityAssessed: SENIORITY_BY_LEVEL[maxLevelPassed],
      maxLevelReached,
      maxLevelPassed,
      ceilingDetected,
      ceilingSignal,
      evidenceCount,
      scenarioHandled,
      keywordCoverage,
      redFlags,
      justification: String(s.justification || ""),
      evidence: Array.isArray(s.evidence) ? s.evidence.slice(0, 3) : [],
      capsApplied,
      insufficientEvidence,
    };
  });

  // -------- Camada C: Eliminadores (suavizados) --------
  const requiredSkills = skillEvaluations.filter((s) => s.skillType === "required");
  const targetLevel = SENIORITY_TARGET_LEVEL[seniorityTarget];

  let forceNotRecommended = false;
  for (const s of requiredSkills) {
    if (s.finalScore < 40) {
      forceNotRecommended = true;
      eliminators.push(`required_below_40:${s.skill}`);
    }
    if (s.evidenceCount === 0 && !s.insufficientEvidence) {
      // sem evidência prática numa required → cap 70 (era 60)
      if (s.finalScore > 70) {
        s.capsApplied.push("no_practical_evidence_cap_70");
        s.finalScore = 70;
        s.level = levelFromScore(s.finalScore);
        eliminators.push(`no_practical_evidence:${s.skill}`);
      }
    }
    // Camada G: vaga sênior+ com skill abaixo do alvo → cap 75 (era not_recommended)
    if (targetLevel >= 3 && SENIORITY_RANK[s.seniorityAssessed] < targetLevel) {
      if (s.finalScore > 75) {
        s.capsApplied.push(`seniority_below_target_cap_75`);
        s.finalScore = 75;
        s.level = levelFromScore(s.finalScore);
      }
      eliminators.push(`seniority_below_target:${s.skill}=${s.seniorityAssessed}<${seniorityTarget}`);
    }
  }
  const lowRequiredCount = requiredSkills.filter((s) => s.finalScore < 55).length;
  if (lowRequiredCount >= 2) {
    forceNotRecommended = true;
    eliminators.push(`multiple_required_below_55:${lowRequiredCount}`);
  }
  const criticalRedFlags = skillEvaluations.flatMap((s) =>
    s.redFlags.filter((f) => ["hallucination", "contradiction"].includes(f)).map((f) => `${f}:${s.skill}`)
  );
  if (criticalRedFlags.length > 0) {
    forceNotRecommended = true;
    eliminators.push(...criticalRedFlags);
  }

  // -------- Score global ponderado (required peso 2x) --------
  let weightedSum = 0;
  let weightTotal = 0;
  for (const s of skillEvaluations) {
    const w = s.skillType === "required" ? 2 : 1;
    weightedSum += s.finalScore * w;
    weightTotal += w;
  }
  let overallScore = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;

  if (durationSeconds < 240) {
    overallScore = 0;
  }

  // -------- Recomendação (threshold suavizado) --------
  let recommendation: "recommended" | "conditional" | "not_recommended" = "conditional";
  const allRequiredAbove55 = requiredSkills.every((s) => s.finalScore >= 55);
  const anyRequiredBelow45 = requiredSkills.some((s) => s.finalScore < 45);

  if (forceNotRecommended || overallScore < 50 || anyRequiredBelow45) {
    recommendation = "not_recommended";
  } else if (overallScore >= 60 && allRequiredAbove55) {
    recommendation = "recommended";
  } else {
    recommendation = "conditional";
  }

  return {
    skillEvaluations,
    overallScore,
    overallLevel: levelFromScore(overallScore),
    recommendation,
    strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
    gaps: Array.isArray(raw.gaps) ? raw.gaps : [],
    summary: String(raw.summary || ""),
    eliminators,
    seniorityTarget,
    durationSeconds,
    candidateTurns,
    evaluationVersion: "v3",
  };
}

// =============================================================================
// ENTRYPOINT
// =============================================================================
export async function evaluateTechnicalV3(args: {
  model: string;
  questions: TechnicalQuestionInput[];
  jobContext: any;
  transcript: string;
  durationSeconds: number;
  candidateTurns: number;
  seniorityTarget: SeniorityTarget;
  icpTechContext?: string;
  maxTokens?: number;
  jobId?: string | null;
}): Promise<{ result: TechnicalEvalV3Result; usage: any }> {
  const prompt = buildEvaluationPrompt({
    jobContext: args.jobContext,
    seniorityTarget: args.seniorityTarget,
    questions: args.questions,
    transcript: args.transcript,
    durationSeconds: args.durationSeconds,
    candidateTurns: args.candidateTurns,
    icpTechContext: args.icpTechContext,
  });

  const { args: rawOutput, usage } = await callLLMTool<any>({
    model: args.model,
    systemPrompt:
      "Você é um avaliador técnico sênior justo e equilibrado. Retorne SEMPRE via function call estruturada. Não calcule recommendation — devolva apenas extração + rawScore por skill.",
    userPrompt: prompt,
    tool: {
      name: "submit_technical_evaluation_v3",
      description: "Avaliação técnica V3 balanceada com escada de senioridade e evidências.",
      parameters: TECH_V3_TOOL_SCHEMA,
    },
    maxTokens: args.maxTokens ?? 3500,
    cacheKey: args.jobId ?? undefined,
    // Resiliência: se o modelo primário falhar com erro não-transiente (ex.: 400),
    // tenta Claude antes de zerar o parecer (evita o "Erro na avaliação automática").
    fallbackModels: ["claude-sonnet-4-5"],
  });

  const result = applyDeterministicRules(rawOutput, {
    questions: args.questions,
    seniorityTarget: args.seniorityTarget,
    durationSeconds: args.durationSeconds,
    candidateTurns: args.candidateTurns,
  });

  return { result, usage };
}

// =============================================================================
// HELPER — inferir senioridade da vaga
// =============================================================================
export function inferSeniorityTarget(jobTitle: string | null | undefined, mission?: string | null): SeniorityTarget {
  const t = `${jobTitle || ""} ${mission || ""}`.toLowerCase();
  if (/\b(staff|principal|lead|líder|head|coordenador|gerente)\b/.test(t)) return "lead";
  if (/\b(s[êe]nior|sr\.?|specialist|especialista)\b/.test(t)) return "senior";
  if (/\b(j[úu]nior|jr\.?|trainee|estagi[áa]rio|estagio)\b/.test(t)) return "junior";
  return "pleno";
}
