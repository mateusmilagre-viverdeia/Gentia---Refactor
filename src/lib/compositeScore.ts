/**
 * Composite Score Calculator
 * Weights: Cultural 50%, DISC 25%, Technical 25%
 * Calculates weighted average of available (non-null) scores only.
 */

const WEIGHTS = {
  cultural: 0.50,
  disc: 0.25,
  technical: 0.25,
} as const;

export interface CompositeScoreInput {
  cultural: number | null;
  disc: number | null;
  technical: number | null;
}

export interface CompositeScoreResult {
  score: number | null;
  availableDimensions: number;
  isComplete: boolean;
}

export function calculateCompositeScore(
  cultural: number | null | undefined,
  disc: number | null | undefined,
  technical: number | null | undefined,
): CompositeScoreResult {
  const scores: number[] = [];
  const weights: number[] = [];

  if (cultural != null) { scores.push(cultural); weights.push(WEIGHTS.cultural); }
  if (disc != null) { scores.push(disc); weights.push(WEIGHTS.disc); }
  if (technical != null) { scores.push(technical); weights.push(WEIGHTS.technical); }

  if (scores.length === 0) {
    return { score: null, availableDimensions: 0, isComplete: false };
  }

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const composite = Math.round(
    scores.reduce((sum, s, i) => sum + s * weights[i], 0) / totalWeight
  );

  return {
    score: composite,
    availableDimensions: scores.length,
    isComplete: scores.length === 3,
  };
}

export function getCompositeScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

export function getCompositeScoreBadgeVariant(score: number | null): "success" | "warning" | "destructive" | "secondary" {
  if (score === null) return "secondary";
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "destructive";
}

export function getCompositeScoreBg(score: number | null): string {
  if (score === null) return "bg-muted";
  if (score >= 70) return "bg-emerald-50 dark:bg-emerald-950/30";
  if (score >= 40) return "bg-amber-50 dark:bg-amber-950/30";
  return "bg-red-50 dark:bg-red-950/30";
}

export { WEIGHTS as COMPOSITE_WEIGHTS };
