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
 * Culture Evaluation V4 — Dilution Ceiling & Dispersion Factor.
 * 
 * Changes from V3:
 * - Implement "Dilution Ceiling" (Teto de Pontuação por Volume).
 * - Ceiling is the MAX between Absolute Volume and Coverage %.
 * - Absolute Volume: <8 (40%), 8-12 (70%), 13-18 (90%), >18 (100%).
 * - Coverage (% of script): <30% (40%), <50% (70%), <70% (90%), >=70% (100%).
 * - Dispersion Factor: Evaluates consistency across different parts of the interview.
 */

export const EVALUATION_SYSTEM_PROMPT_V4 = `Você é um avaliador de fit cultural experiente, focado em identificar o "DNA" do candidato através de sua fala.

SUA TAREFA:
Identificar a INTENSIDADE, RECORRÊNCIA e CONSISTÊNCIA dos valores demonstrados pelo candidato. Não exija um formato acadêmico de resposta; valorize a autenticidade e a profundidade do alinhamento.

FATOR DE DISPERSÃO (NOVO):
Avalie se os valores são demonstrados de forma consistente em diferentes momentos da entrevista. Se o candidato demonstra um valor apenas uma vez em uma única pergunta, a confiança é menor do que se ele demonstrar o mesmo valor de formas diferentes em 3 ou 4 momentos distintos.

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

4. CONFIANÇA DA AVALIAÇÃO (FATOR DE DISPERSÃO):
   - \`confidenceLevel: "low"\`    quando \`evidenceCount\` < 2 ou evidências concentradas em uma única resposta.
   - \`confidenceLevel: "medium"\` quando \`evidenceCount\` = 2–3 e dispersas em pelo menos 2 momentos.
   - \`confidenceLevel: "high"\`   quando \`evidenceCount\` ≥ 4 e dispersas em 3 ou mais momentos.

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

export interface ScoringInputV4 {
  evaluations: CriterionEvaluationLegacy[];
  agentCriteria: AgentCriterionLite[];
  durationSeconds: number | null | undefined;
  responsesCount: number;
  totalScriptQuestionsCount: number;
  strictnessProfile?: StrictnessProfile;
}

export interface ScoringResultV4 {
  finalScore: number;
  recommendation: Recommendation;
  failedCriteria: Array<{ name: string; score: number; minimum: number; importance: Importance }>;
  criteriaWithImpact: any[];
  auditTrail: AuditEntry[];
  evidenceFloorPassed: boolean;
  redFlagsCount: number;
  avgConfidenceLevel: ConfidenceLevel;
  avgEvidenceCount: number;
  strictnessProfileUsed: StrictnessProfile;
  ceilingsApplied: {
    absoluteVolumeCeiling: number;
    coverageCeiling: number;
    finalCeiling: number;
  };
}

export function calculateFinalScoreV4(input: ScoringInputV4): ScoringResultV4 {
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
  const failedCriteria: any[] = [];
  const criteriaWithImpact: any[] = [];

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

  // ---------------------------------------------------------------------------
  // DILUTION CEILING (Teto de Volume) - V4
  // ---------------------------------------------------------------------------
  const responses = input.responsesCount ?? 0;
  const totalScriptQuestions = input.totalScriptQuestionsCount || 1; // avoid div by zero
  const coveragePercent = (responses / totalScriptQuestions) * 100;

  // Table 1: Absolute Volume
  let absoluteCeiling = 100;
  if (responses < 8) absoluteCeiling = 40;
  else if (responses <= 12) absoluteCeiling = 70;
  else if (responses <= 18) absoluteCeiling = 90;

  // Table 2: Relative Coverage
  let coverageCeiling = 100;
  if (coveragePercent < 30) coverageCeiling = 40;
  else if (coveragePercent < 50) coverageCeiling = 70;
  else if (coveragePercent < 70) coverageCeiling = 90;

  // Final Ceiling: MENOR entre Absoluto e Relativo (Rigor Máximo solicitado)
  const finalCeiling = Math.min(absoluteCeiling, coverageCeiling);

  // Apply ceiling to each individual criterion score before final weighted average
  for (const c of criteriaWithImpact) {
    if (c.score > finalCeiling) {
      c.originalScore = c.score;
      c.score = finalCeiling;
      c.ceilingApplied = true;
    }
  }

  // Recalculate weightedSum with capped individual scores
  weightedSum = 0;
  for (const c of criteriaWithImpact) {
    weightedSum += c.score * c.effectiveWeight;
  }

  let finalScore =
    totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;

  const avgEvidenceCount = evaluatedCount > 0 ? totalEvidence / evaluatedCount : 0;
  const avgConfidenceScore =
    evaluatedCount > 0 ? confidenceScoreSum / evaluatedCount : 1;
  const avgConfidenceLevel: ConfidenceLevel =
    avgConfidenceScore >= 2.5 ? "high" : avgConfidenceScore >= 1.5 ? "medium" : "low";

  const scoreIsLimited = finalScore > finalCeiling; // This is now mostly redundant but kept for audit logging
  if (scoreIsLimited) {
    audit.push({
      rule: "dilution_ceiling",
      detail: `Score final e critérios individuais limitados ao teto de ${finalCeiling}% (Respostas: ${responses}, Cobertura: ${coveragePercent.toFixed(1)}%)`,
      outcome: "Nota limitada pela amostragem insuficiente em todos os níveis",
    });
  }

  // ---------------------------------------------------------------------------
  // DURATION FLOOR (Reintegrado) - V4: 10 minutes (600s)
  // ---------------------------------------------------------------------------
  const duration = input.durationSeconds ?? 0;
  let durationFloorPassed = true;

  if (duration > 0 && duration < 600) {
    durationFloorPassed = false;
    audit.push({
      rule: "duration_floor.too_short",
      detail: `Entrevista durou ${Math.round(duration)}s (< 10min)`,
      outcome: "Bloqueia RECOMENDADO e reduz score final proporcionalmente",
    });
    // Penalização progressiva em vez de corte seco
    const penaltyMultiplier = duration / 600; 
    finalScore = finalScore * penaltyMultiplier;
  }

  let evidenceFloorPassed = responses >= 8;
  if (!evidenceFloorPassed) {
    audit.push({
      rule: "evidence_floor.low_responses",
      detail: `Candidato respondeu apenas ${responses} perguntas (mínimo 8)`,
      outcome: "Bloqueia RECOMENDADO por falta de recorrência/consistência",
    });
  }

  // ---------------------------------------------------------------------------
  // RECOMMENDATION LOGIC
  // ---------------------------------------------------------------------------
  let recommendation: Recommendation;

  if (
    finalScore >= RECOMMENDED_THRESHOLD &&
    failedCriteria.length === 0 &&
    avgEvidenceCount >= 1.2 &&
    evidenceFloorPassed &&
    durationFloorPassed &&
    finalCeiling >= 90 &&
    !scoreIsLimited
  ) {
    recommendation = "RECOMENDADO";
  } else if (
    finalScore >= RESSALVAS_THRESHOLD &&
    !failedCriteria.some(
      (f: any) => f.importance === "critical" || f.importance === "very_important"
    )
  ) {
    recommendation = "RECOMENDADO_COM_RESSALVAS";
  } else {
    recommendation = "NAO_RECOMENDADO";
  }

  // Hard eliminators
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
    ceilingsApplied: {
      absoluteVolumeCeiling: absoluteCeiling,
      coverageCeiling: coverageCeiling,
      finalCeiling: finalCeiling,
    }
  };
}
