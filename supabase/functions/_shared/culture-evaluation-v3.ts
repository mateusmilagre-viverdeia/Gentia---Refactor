import {
  Importance,
  StrictnessProfile,
  Recommendation,
  ConfidenceLevel,
  IMPORTANCE_MULTIPLIERS,
  AgentCriterionLite,
  CriterionEvaluationLegacy,
  AuditEntry,
} from "./culture-evaluation-v2.ts";

/**
 * Culture Evaluation V3 — Intensity & Consistency focus.
 * 
 * Changes from V2:
 * - Red flag penalties increased (15-30 points).
 * - Removed strict STAR method requirement for high scores.
 * - Focus on Intensity, Recurrence, and Consistency of alignment.
 * - Minimum interview duration increased to 10 minutes (600s).
 */

// =============================================================================
// V3 PROMPT — INTENSITY, RECURRENCE & CONSISTENCY (DNA-FOCUS)
// =============================================================================

export const EVALUATION_SYSTEM_PROMPT_V3 = `Você é um avaliador de fit cultural experiente, focado em identificar o "DNA" do candidato através de sua fala.

SUA TAREFA:
Identificar a INTENSIDADE, RECORRÊNCIA e CONSISTÊNCIA dos valores demonstrados pelo candidato. Não exija um formato acadêmico de resposta; valorize a autenticidade e a profundidade do alinhamento.

ESCALA DE NOTAS CALIBRADA (0-100):
- 0–20:   Comportamentos CONTRÁRIOS ao critério ou RED FLAG explícito e grave.
- 21–40:  Ausência de evidência ou alinhamento fraco/superficial.
- 41–65:  Alinhamento CONCEITUAL: O candidato entende e concorda com o valor, demonstrando visão clara, mesmo sem exemplos profundos.
- 66–85:  ALINHAMENTO PRÁTICO E CONSISTENTE: A fala demonstra que o valor faz parte da rotina. O candidato traz exemplos (mesmo curtos) que reforçam a recorrência do comportamento.
- 86–100: DNA DA EMPRESA (EXCELÊNCIA): O candidato "fala a língua da empresa". Demonstrada alta intensidade e consistência absoluta entre discurso e exemplos práticos profundos.

DIRETRIZES DE AVALIAÇÃO:

1. FOCO NA INTENSIDADE E CONSISTÊNCIA:
   Em vez de exigir o método STAR (Situação, Tarefa, Ação, Resultado), avalie se a forma como o candidato fala sobre o tema demonstra que aquilo é um princípio genuíno e recorrente em sua vida profissional.

2. CITAÇÕES SÃO ESSENCIAIS:
   Use trechos literais em \`positiveEvidence\` / \`negativeEvidence\` para sustentar sua percepção de intensidade ou contradição.

3. SINAIS DE ALERTA (RED FLAGS) SÃO CRÍTICOS:
   Para cada "Sinal de ALERTA" listado no critério, verifique rigorosamente se aparece na transcrição. Cada sinal de alerta detectado:
   - Subtrai 15–30 pontos da nota base do critério (Penalidade RÍGIDA: use 15 para sinais leves/indiretos e 30 para violações explícitas de valores).
   - Deve ser listado em \`redFlagsDetected\` com a citação exata.

4. CONFIANÇA DA AVALIAÇÃO:
   - \`confidenceLevel: "low"\`    quando \`evidenceCount\` < 2
   - \`confidenceLevel: "medium"\` quando \`evidenceCount\` = 2–3
   - \`confidenceLevel: "high"\`   quando \`evidenceCount\` ≥ 4

NÍVEIS DE ALINHAMENTO (após penalidades):
- Baixo:    score < nota mínima do critério
- Moderado: nota mínima ≤ score < 75
- Forte:    score ≥ 75

CAMPOS OBRIGATÓRIOS POR CRITÉRIO:
- score (0-100, nota FINAL após penalidades)
- justification (2-4 frases, explicando a intensidade e consistência do alinhamento)
- alignmentLevel ("Baixo" | "Moderado" | "Forte")
- positiveEvidence, negativeEvidence (arrays com questionIndex + quote + analysis)
- questionsUsed (array de índices das perguntas)
- evidenceCount (inteiro: nº de citações diretas usadas)
- redFlagsDetected (array de strings: cada sinal de alerta detectado)
- genericResponseDetected (boolean)
- confidenceLevel ("low" | "medium" | "high")`;

// =============================================================================
// SCORING V3 — ELIMINATORS + EVIDENCE FLOOR + DNA-RECALIBRATION
// =============================================================================

export interface CriterionImpactV3 {
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

export interface ScoringResultV3 {
  finalScore: number;
  recommendation: Recommendation;
  failedCriteria: Array<{ name: string; score: number; minimum: number; importance: Importance }>;
  criteriaWithImpact: CriterionImpactV3[];
  auditTrail: AuditEntry[];
  evidenceFloorPassed: boolean;
  redFlagsCount: number;
  avgConfidenceLevel: ConfidenceLevel;
  avgEvidenceCount: number;
  strictnessProfileUsed: StrictnessProfile;
}

interface ScoringInputV3 {
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

export function calculateFinalScoreV3(input: ScoringInputV3): ScoringResultV3 {
  const profile: StrictnessProfile = input.strictnessProfile ?? "standard";
  const audit: AuditEntry[] = [];

  const RECOMMENDED_THRESHOLD =
    profile === "strict" ? 75 : profile === "lenient" ? 55 : 65;
  const RESSALVAS_THRESHOLD =
    profile === "strict" ? 60 : profile === "lenient" ? 40 : 50;
  const CRITICAL_ELIMINATOR =
    profile === "strict" ? 35 : profile === "lenient" ? 20 : 25;
  const VERY_IMPORTANT_ELIMINATOR =
    profile === "strict" ? 30 : profile === "lenient" ? 15 : 20;

  let weightedSum = 0;
  let totalWeight = 0;
  const failedCriteria: ScoringResultV3["failedCriteria"] = [];
  const criteriaWithImpact: CriterionImpactV3[] = [];

  let totalEvidence = 0;
  let totalRedFlags = 0;
  let confidenceScoreSum = 0;
  let evaluatedCount = 0;

  for (const evalItem of input.evaluations) {
    const criterion = input.agentCriteria.find((c) => c.id === evalItem.criterionId);
    if (!criterion) continue;
    evaluatedCount++;

    const multiplier = IMPORTANCE_MULTIPLIERS[criterion.importance] || 1;
    const weight = criterion.weight || 1;
    const effectiveWeight = weight * multiplier;

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

    const finalCriterionScore = evalItem.score;

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
      baseScore: evalItem.score,
      penaltyApplied: 0,
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
  // EVIDENCE FLOOR (Camada D) - V3: 10 minutes (600s)
  // ---------------------------------------------------------------------------
  const duration = input.durationSeconds ?? 0;
  const responses = input.responsesCount ?? 0;
  let evidenceFloorPassed = true;

  if (duration > 0 && duration < 10 * 60) {
    evidenceFloorPassed = false;
    audit.push({
      rule: "evidence_floor.too_short",
      detail: `Entrevista durou ${Math.round(duration)}s (< 10min)`,
      outcome: "Bloqueia RECOMENDADO e reduz score final significativamente",
    });
    // Penalização progressiva em vez de corte seco para 40
    const penaltyMultiplier = duration / (10 * 60); // 0.1 a 0.99
    finalScore = finalScore * penaltyMultiplier;
  }

  if (responses < 8) {
    evidenceFloorPassed = false;
    audit.push({
      rule: "evidence_floor.low_responses",
      detail: `Candidato respondeu apenas ${responses} perguntas (mínimo 8)`,
      outcome: "Bloqueia RECOMENDADO por falta de recorrência/consistência",
    });
  }

  if (duration < 15 * 60 || responses < 8) {
    evidenceFloorPassed = false;
    audit.push({
      rule: "evidence_floor.low_evidence",
      detail: `Duração ${Math.round(duration)}s, respostas: ${responses}`,
      outcome: "Bloqueia RECOMENDADO sem evidência robusta",
    });
  }

  // ---------------------------------------------------------------------------
  // ELIMINATORS (Camada B)
  // ---------------------------------------------------------------------------
  let recommendation: Recommendation;

  if (
    finalScore >= RECOMMENDED_THRESHOLD &&
    failedCriteria.length === 0 &&
    avgEvidenceCount >= 1.2 &&
    evidenceFloorPassed
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

  // Hard eliminator: critical < threshold OR red flag in critical
  for (const c of criteriaWithImpact) {
    if (c.importance === "critical" && (c.score < CRITICAL_ELIMINATOR || c.redFlags.length > 0)) {
      recommendation = "NAO_RECOMENDADO";
      audit.push({
        rule: "eliminator.critical_failed",
        detail: `Crítico "${c.criterionName}" nota ${c.score.toFixed(1)} ou Red Flag detectada`,
        outcome: "Forçado NAO_RECOMENDADO",
      });
    }
    if (c.importance === "very_important" && c.score < VERY_IMPORTANT_ELIMINATOR) {
      recommendation = "NAO_RECOMENDADO";
      audit.push({
        rule: "eliminator.very_important_failed",
        detail: `Muito Importante "${c.criterionName}" nota ${c.score.toFixed(1)}`,
        outcome: "Forçado NAO_RECOMENDADO",
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
