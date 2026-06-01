/**
 * Culture Evaluation V2 — calibrated rubric, anti-leniency prompt, eliminators,
 * evidence floor, and shadow-mode persistence.
 *
 * Consumed by:
 *   - culture-interview-complete
 *   - reprocess-culture-evaluation
 *
 * Shadow mode (default ON during 7-day rollout): both legacy and new scores are
 * computed and persisted in parallel. The platform setting
 * `culture_evaluation_active_version` decides which one is exposed as the
 * canonical `matching_score` to recruiters.
 */

export type Importance = "minor" | "moderate" | "important" | "very_important" | "critical";
export type StrictnessProfile = "lenient" | "standard" | "strict";
export type Recommendation = "RECOMENDADO" | "RECOMENDADO_COM_RESSALVAS" | "NAO_RECOMENDADO";
export type ConfidenceLevel = "low" | "medium" | "high";

export const IMPORTANCE_MULTIPLIERS: Record<Importance, number> = {
  minor: 1,
  moderate: 2,
  important: 3,
  very_important: 4,
  critical: 5,
};

export const IMPORTANCE_LABELS: Record<Importance, string> = {
  minor: "Pouco Importante (x1)",
  moderate: "Moderado (x2)",
  important: "Importante (x3)",
  very_important: "Muito Importante (x4)",
  critical: "Crítico (x5)",
};

export interface AgentCriterionLite {
  id: string;
  name: string;
  description: string;
  excellenceDescription: string;
  warningSignsDescription: string;
  minimumScore: number; // 0-10
  importance: Importance;
  weight: number;
}

export interface CriterionEvaluationLegacy {
  criterionId: string;
  criterionName: string;
  score: number; // 0-100 — legacy, becomes "base_score" under V2
  justification: string;
  alignmentLevel: "Baixo" | "Moderado" | "Forte";
  positiveEvidence: Array<{ questionIndex: number; quote: string; analysis: string }>;
  negativeEvidence: Array<{ questionIndex: number; quote: string; analysis: string }>;
  questionsUsed: number[];
  // V2 extensions (optional in legacy schema, required when V2 prompt is used)
  evidenceCount?: number;
  redFlagsDetected?: string[];
  genericResponseDetected?: boolean;
  confidenceLevel?: ConfidenceLevel;
}

// =============================================================================
// V2 PROMPT — CALIBRATED, ANTI-LENIENCY
// =============================================================================

export const EVALUATION_SYSTEM_PROMPT_V2 = `Você é um avaliador de fit cultural experiente.
Avalie de forma justa e fundamentada, usando as evidências disponíveis na transcrição.
Aceite sinais conceituais como evidência válida quando o candidato demonstrar alinhamento,
ajustando a nota conforme a profundidade e concretude do exemplo.

ESCALA DE NOTAS CALIBRADA (0-100):
- 0–20:   Comportamentos CONTRÁRIOS ao critério ou red flag explícito.
- 21–40:  Ausência de evidência ou evidência muito fraca/indireta.
- 41–55:  Evidência parcial COM RESSALVAS (faltam exemplos concretos).
- 56–70:  Evidência clara, BOM mas NÃO EXCELENTE (exemplos genéricos).
- 71–85:  Evidência consistente com exemplos comportamentais (situação + ação + resultado).
- 86–100: EXCELÊNCIA RARA — exige ≥ 2 exemplos concretos e profundos.

DIRETRIZES DE AVALIAÇÃO:

1. EVIDÊNCIA É O QUE GUIA A NOTA:
   Sempre que possível, cite literalmente trechos da fala do candidato em
   \`positiveEvidence\` / \`negativeEvidence\`. Use a escala calibrada
   acima — não há tetos numéricos fixos por ausência de citação ou STAR.

2. RESPOSTAS GENÉRICAS:
   Quando o candidato responde com chavões sem exemplo concreto
   ("sou proativo", "trabalho em equipe", "comunicação aberta"),
   marque \`genericResponseDetected: true\` para auditoria, mas posicione a
   nota na faixa apropriada da escala (tipicamente 41–70 conforme alinhamento
   conceitual demonstrado, sem teto rígido).

3. RESPOSTAS EVASIVAS / QUE NÃO RESPONDEM À PERGUNTA:
   Reduza a nota para a faixa 21–45 conforme a gravidade da evasão.

4. SINAIS DE ALERTA SÃO ATIVAMENTE PROCURADOS:
   Para cada "Sinal de ALERTA" listado no critério, verifique se aparece na
   transcrição. Cada sinal de alerta detectado:
   - Subtrai 5–10 pontos da nota base do critério (penalidade leve — use 10 só
     para alertas explícitos e graves).
   - Deve ser listado em \`redFlagsDetected\` com a citação exata.

5. CONFIANÇA DA AVALIAÇÃO:
   - \`confidenceLevel: "low"\`    quando \`evidenceCount\` < 2
   - \`confidenceLevel: "medium"\` quando \`evidenceCount\` = 2–3
   - \`confidenceLevel: "high"\`   quando \`evidenceCount\` ≥ 4

NÍVEIS DE ALINHAMENTO (após penalidades):
- Baixo:    score < nota mínima do critério
- Moderado: nota mínima ≤ score < 75
- Forte:    score ≥ 75

CAMPOS OBRIGATÓRIOS POR CRITÉRIO:
- score (0-100, nota FINAL após penalidades)
- justification (2-4 frases, citando trechos do candidato entre aspas)
- alignmentLevel ("Baixo" | "Moderado" | "Forte")
- positiveEvidence, negativeEvidence (arrays com questionIndex + quote + analysis)
- questionsUsed (array de índices das perguntas)
- evidenceCount (inteiro: nº de citações diretas usadas)
- redFlagsDetected (array de strings: cada sinal de alerta detectado)
- genericResponseDetected (boolean)
- confidenceLevel ("low" | "medium" | "high")

Seja justo: reconheça alinhamento conceitual quando existir, e seja criterioso
quando a evidência for fraca ou contraditória.`;

// =============================================================================
// SCORING V2 — ELIMINATORS + EVIDENCE FLOOR + RECALIBRATED THRESHOLDS
// =============================================================================

export interface CriterionImpactV2 {
  criterionId: string;
  criterionName: string;
  score: number;
  baseScore: number;
  penaltyApplied: number;
  weight: number;
  multiplier: number;
  effectiveWeight: number;
  impactPercentage: number;
  minimumPercent: number;
  passed: boolean;
  importance: Importance;
  evidenceCount: number;
  redFlags: string[];
  confidenceLevel: ConfidenceLevel;
  genericResponseDetected: boolean;
}

export interface AuditEntry {
  rule: string;
  detail: string;
  outcome: string;
}

export interface ScoringResultV2 {
  finalScore: number;
  recommendation: Recommendation;
  failedCriteria: Array<{ name: string; score: number; minimum: number; importance: Importance }>;
  criteriaWithImpact: CriterionImpactV2[];
  auditTrail: AuditEntry[];
  evidenceFloorPassed: boolean;
  redFlagsCount: number;
  avgConfidenceLevel: ConfidenceLevel;
  avgEvidenceCount: number;
  strictnessProfileUsed: StrictnessProfile;
}

interface ScoringInputV2 {
  evaluations: CriterionEvaluationLegacy[];
  agentCriteria: AgentCriterionLite[];
  durationSeconds: number | null | undefined;
  responsesCount: number;
  strictnessProfile?: StrictnessProfile;
}

function downgrade(rec: Recommendation): Recommendation {
  if (rec === "RECOMENDADO") return "RECOMENDADO_COM_RESSALVAS";
  return "NAO_RECOMENDADO";
}

export function calculateFinalScoreV2(input: ScoringInputV2): ScoringResultV2 {
  const profile: StrictnessProfile = input.strictnessProfile ?? "standard";
  const audit: AuditEntry[] = [];

  // Strictness modifiers
  // - lenient: thresholds lowered, no red-flag downgrade
  // - standard: defaults below
  // - strict: thresholds raised by 5pp, single critical eliminator at <50
  const RECOMMENDED_THRESHOLD =
    profile === "strict" ? 70 : profile === "lenient" ? 55 : 60;
  const RESSALVAS_THRESHOLD =
    profile === "strict" ? 55 : profile === "lenient" ? 40 : 45;
  const CRITICAL_ELIMINATOR =
    profile === "strict" ? 30 : profile === "lenient" ? 15 : 20;
  const VERY_IMPORTANT_ELIMINATOR =
    profile === "strict" ? 25 : profile === "lenient" ? 10 : 15;

  let weightedSum = 0;
  let totalWeight = 0;
  const failedCriteria: ScoringResultV2["failedCriteria"] = [];
  const criteriaWithImpact: CriterionImpactV2[] = [];

  let totalEvidence = 0;
  let totalRedFlags = 0;
  let confidenceScoreSum = 0; // low=1 medium=2 high=3
  let evaluatedCount = 0;

  for (const evalItem of input.evaluations) {
    const criterion = input.agentCriteria.find((c) => c.id === evalItem.criterionId);
    if (!criterion) continue;
    evaluatedCount++;

    const multiplier = IMPORTANCE_MULTIPLIERS[criterion.importance] || 1;
    const weight = criterion.weight || 1;
    const effectiveWeight = weight * multiplier;

    // V2 default minimum: 60% (was 50%) when agent didn't override
    // (criterion.minimumScore is 0-10 scale)
    const minimumPercent =
      criterion.minimumScore != null
        ? criterion.minimumScore * 10
        : profile === "lenient"
        ? 50
        : 60;

    const evidenceCount = evalItem.evidenceCount ?? 0;
    const redFlags = evalItem.redFlagsDetected ?? [];
    const confidenceLevel = (evalItem.confidenceLevel ?? "low") as ConfidenceLevel;
    const genericResponseDetected = !!evalItem.genericResponseDetected;

    totalEvidence += evidenceCount;
    totalRedFlags += redFlags.length;
    confidenceScoreSum +=
      confidenceLevel === "high" ? 3 : confidenceLevel === "medium" ? 2 : 1;

    // The AI is instructed to apply penalties already. We trust evalItem.score
    // as the FINAL post-penalty value, but we record baseScore = AI's raw score
    // (we don't have it separately, so baseScore == score when AI integrates penalties).
    const baseScore = evalItem.score;
    const finalCriterionScore = evalItem.score;
    const penaltyApplied = 0; // placeholder; AI does the math now

    weightedSum += finalCriterionScore * effectiveWeight;
    totalWeight += effectiveWeight;

    const passed = finalCriterionScore >= minimumPercent;
    if (!passed) {
      failedCriteria.push({
        name: criterion.name,
        score: finalCriterionScore,
        minimum: minimumPercent,
        importance: criterion.importance,
      });
    }

    criteriaWithImpact.push({
      criterionId: criterion.id,
      criterionName: criterion.name,
      score: finalCriterionScore,
      baseScore,
      penaltyApplied,
      weight,
      multiplier,
      effectiveWeight,
      impactPercentage: 0,
      minimumPercent,
      passed,
      importance: criterion.importance,
      evidenceCount,
      redFlags,
      confidenceLevel,
      genericResponseDetected,
    });
  }

  if (totalWeight > 0) {
    for (const c of criteriaWithImpact) {
      c.impactPercentage = (c.effectiveWeight / totalWeight) * 100;
    }
  }

  let finalScore =
    totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;

  const avgEvidenceCount = evaluatedCount > 0 ? totalEvidence / evaluatedCount : 0;
  const avgConfidenceScore =
    evaluatedCount > 0 ? confidenceScoreSum / evaluatedCount : 1;
  const avgConfidenceLevel: ConfidenceLevel =
    avgConfidenceScore >= 2.5 ? "high" : avgConfidenceScore >= 1.5 ? "medium" : "low";

  // ---------------------------------------------------------------------------
  // EVIDENCE FLOOR (Camada D)
  // ---------------------------------------------------------------------------
  const duration = input.durationSeconds ?? 0;
  const responses = input.responsesCount ?? 0;
  let evidenceFloorPassed = true;
  let evidenceFloorCap: number | null = null;

  if (duration > 0 && duration < 4 * 60) {
    evidenceFloorPassed = false;
    audit.push({
      rule: "evidence_floor.too_short",
      detail: `Entrevista durou ${Math.round(duration)}s (< 4min)`,
      outcome: "Forçar NAO_RECOMENDADO (entrevista insuficiente)",
    });
    finalScore = Math.min(finalScore, 40);
    return {
      finalScore,
      recommendation: "NAO_RECOMENDADO",
      failedCriteria,
      criteriaWithImpact,
      auditTrail: audit,
      evidenceFloorPassed,
      redFlagsCount: totalRedFlags,
      avgConfidenceLevel,
      avgEvidenceCount,
      strictnessProfileUsed: profile,
    };
  }

  if (duration < 6 * 60 || responses < 5) {
    evidenceFloorPassed = false;
    evidenceFloorCap = 80;
    audit.push({
      rule: "evidence_floor.low_evidence",
      detail: `Duração ${Math.round(duration)}s, respostas: ${responses}`,
      outcome: "Cap no score em 80 e bloqueia RECOMENDADO",
    });
  }

  // ---------------------------------------------------------------------------
  // ELIMINATORS (Camada B)
  // ---------------------------------------------------------------------------
  let recommendation: Recommendation;

  // Default decision based on score + failed criteria + evidence
  if (
    finalScore >= RECOMMENDED_THRESHOLD &&
    failedCriteria.length === 0 &&
    avgEvidenceCount >= 0.9
  ) {
    recommendation = "RECOMENDADO";
  } else if (
    finalScore >= RESSALVAS_THRESHOLD &&
    !failedCriteria.some(
      (f) => f.importance === "critical" || f.importance === "very_important"
    )
  ) {
    recommendation = "RECOMENDADO_COM_RESSALVAS";
  } else {
    recommendation = "NAO_RECOMENDADO";
  }

  // Hard eliminator: critical < threshold
  for (const c of criteriaWithImpact) {
    if (c.importance === "critical" && c.score < CRITICAL_ELIMINATOR) {
      recommendation = "NAO_RECOMENDADO";
      audit.push({
        rule: "eliminator.critical_below_threshold",
        detail: `Crítico "${c.criterionName}" = ${c.score.toFixed(1)} < ${CRITICAL_ELIMINATOR}`,
        outcome: "Forçado NAO_RECOMENDADO",
      });
    }
    if (c.importance === "very_important" && c.score < VERY_IMPORTANT_ELIMINATOR) {
      recommendation = "NAO_RECOMENDADO";
      audit.push({
        rule: "eliminator.very_important_below_threshold",
        detail: `Muito Importante "${c.criterionName}" = ${c.score.toFixed(1)} < ${VERY_IMPORTANT_ELIMINATOR}`,
        outcome: "Forçado NAO_RECOMENDADO",
      });
    }
  }

  // ≥2 important reproved -> cap at RESSALVAS
  const importantFailed = failedCriteria.filter(
    (f) => f.importance === "important"
  );
  if (importantFailed.length >= 2 && recommendation === "RECOMENDADO") {
    recommendation = "RECOMENDADO_COM_RESSALVAS";
    audit.push({
      rule: "eliminator.two_important_failed",
      detail: `${importantFailed.length} critérios importantes reprovados`,
      outcome: "Rebaixado para RECOMENDADO_COM_RESSALVAS",
    });
  }

  // Red flags in critical/very_important -> downgrade by 1 level
  if (profile !== "lenient") {
    const redFlagInHighImpact = criteriaWithImpact.some(
      (c) =>
        (c.importance === "critical" || c.importance === "very_important") &&
        c.redFlags.length > 0
    );
    if (redFlagInHighImpact) {
      const newRec = downgrade(recommendation);
      if (newRec !== recommendation) {
        audit.push({
          rule: "eliminator.red_flag_in_high_impact",
          detail: "Sinais de alerta em critérios críticos/muito importantes",
          outcome: `Rebaixado de ${recommendation} para ${newRec}`,
        });
        recommendation = newRec;
      }
    }
  }

  // Global red flags >= 3 -> cap at RESSALVAS
  if (totalRedFlags >= 3 && recommendation === "RECOMENDADO") {
    recommendation = "RECOMENDADO_COM_RESSALVAS";
    audit.push({
      rule: "eliminator.global_red_flags",
      detail: `${totalRedFlags} sinais de alerta no total`,
      outcome: "Rebaixado para RECOMENDADO_COM_RESSALVAS",
    });
  }

  // Evidence floor cap
  if (evidenceFloorCap != null && finalScore > evidenceFloorCap) {
    finalScore = evidenceFloorCap;
    if (recommendation === "RECOMENDADO") {
      recommendation = "RECOMENDADO_COM_RESSALVAS";
      audit.push({
        rule: "evidence_floor.recommended_blocked",
        detail: "Baixa evidência impede RECOMENDADO",
        outcome: "Rebaixado para RECOMENDADO_COM_RESSALVAS",
      });
    }
  }

  return {
    finalScore,
    recommendation,
    failedCriteria,
    criteriaWithImpact,
    auditTrail: audit,
    evidenceFloorPassed,
    redFlagsCount: totalRedFlags,
    avgConfidenceLevel,
    avgEvidenceCount,
    strictnessProfileUsed: profile,
  };
}

// =============================================================================
// LEGACY SCORING (kept identical for shadow-mode comparison)
// =============================================================================

export interface ScoringResultLegacy {
  finalScore: number;
  recommendation: Recommendation;
  failedCriteria: Array<{ name: string; score: number; minimum: number; importance: Importance }>;
}

export function calculateFinalScoreLegacy(
  evaluations: CriterionEvaluationLegacy[],
  agentCriteria: AgentCriterionLite[]
): ScoringResultLegacy {
  let weightedSum = 0;
  let totalWeight = 0;
  const failedCriteria: ScoringResultLegacy["failedCriteria"] = [];

  for (const evalItem of evaluations) {
    const criterion = agentCriteria.find((c) => c.id === evalItem.criterionId);
    if (!criterion) continue;
    const multiplier = IMPORTANCE_MULTIPLIERS[criterion.importance] || 1;
    const weight = criterion.weight || 1;
    const effectiveWeight = weight * multiplier;
    weightedSum += evalItem.score * effectiveWeight;
    totalWeight += effectiveWeight;
    const minimumPercent = (criterion.minimumScore || 5) * 10;
    if (evalItem.score < minimumPercent) {
      failedCriteria.push({
        name: criterion.name,
        score: evalItem.score,
        minimum: minimumPercent,
        importance: criterion.importance,
      });
    }
  }

  const finalScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
  const criticalFailed = failedCriteria.filter(
    (f) => f.importance === "critical" || f.importance === "very_important"
  );
  let recommendation: Recommendation;
  if (finalScore >= 75 && failedCriteria.length === 0) recommendation = "RECOMENDADO";
  else if (finalScore >= 50 && criticalFailed.length === 0)
    recommendation = "RECOMENDADO_COM_RESSALVAS";
  else recommendation = "NAO_RECOMENDADO";

  return { finalScore, recommendation, failedCriteria };
}

// =============================================================================
// SHADOW MODE — read platform settings
// =============================================================================

export type ActiveVersion = "legacy" | "new";

export interface ShadowConfig {
  shadowEnabled: boolean;
  activeVersion: ActiveVersion;
}

export async function loadShadowConfig(supabase: any): Promise<ShadowConfig> {
  try {
    const { data } = await supabase
      .from("platform_evaluation_settings")
      .select("key, value")
      .in("key", ["culture_evaluation_active_version", "culture_evaluation_shadow_enabled"]);

    const map = new Map<string, any>();
    for (const row of data ?? []) map.set(row.key, row.value);

    const activeVersion = (map.get("culture_evaluation_active_version") ?? "legacy") as ActiveVersion;
    const shadowEnabled = map.get("culture_evaluation_shadow_enabled") ?? true;

    return {
      activeVersion: activeVersion === "new" ? "new" : "legacy",
      shadowEnabled: shadowEnabled === false ? false : true,
    };
  } catch {
    return { shadowEnabled: true, activeVersion: "legacy" };
  }
}

// =============================================================================
// V2 TOOL SCHEMA EXTENSIONS
// =============================================================================

export const CRITERION_V2_EXTRA_PROPS = {
  evidenceCount: {
    type: "number",
    description:
      "Inteiro: nº de citações diretas usadas para sustentar a nota deste critério.",
  },
  redFlagsDetected: {
    type: "array",
    items: { type: "string" },
    description:
      'Lista de sinais de alerta detectados (cada item: "<sinal>: \"<citação>\"").',
  },
  genericResponseDetected: {
    type: "boolean",
    description:
      "true se as respostas relevantes foram genéricas/sem exemplo concreto.",
  },
  confidenceLevel: {
    type: "string",
    enum: ["low", "medium", "high"],
    description:
      "Confiança da avaliação deste critério (low quando evidenceCount<2).",
  },
};
