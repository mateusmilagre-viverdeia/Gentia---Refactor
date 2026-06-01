export interface PeoplePerformanceWeights {
  cultural: number;      // 0-100
  performance: number;   // 0-100
  maturity: number;      // 0-100
}

export const DEFAULT_WEIGHTS: PeoplePerformanceWeights = {
  cultural: 35,
  performance: 40,
  maturity: 25,
};

export interface SourceReference {
  id: string;
  parentId: string;  // analysisId or assessmentId
  name?: string;
}

export interface PeoplePerformanceScore {
  id: string;
  personKey: string;        // Normalized name for matching
  displayName: string;      // Original name for display
  culturalScore: number | null;      // 0-100
  performanceScore: number | null;   // 0-100
  maturityScore: number | null;      // 0-100
  peoplePerformanceIndex: number;    // 0-100 (weighted average)
  availableAssessments: number;      // How many of 3 assessments are available
  sources: {
    peopleAnalysis?: SourceReference;
    performanceAssessment?: SourceReference;
    teamMaturity?: SourceReference;
  };
}

/**
 * Normalize a name for matching across tools
 * Removes accents, converts to lowercase, trims
 */
export function normalizeNameForMatching(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove accents
    .replace(/\s+/g, ' ')              // Normalize spaces
    .trim();
}

/**
 * Create a person key from first and last name
 */
export function createPersonKey(firstName: string, lastName?: string): string {
  const fullName = lastName ? `${firstName} ${lastName}` : firstName;
  return normalizeNameForMatching(fullName);
}

/**
 * Calculate cultural score from people analysis member
 * Score is based on ratings (1-5 scale) averaged across all values
 */
export function calculateCulturalScore(
  memberTotal: number,
  valuesCount: number,
  maxScorePerValue: number = 5
): number {
  if (valuesCount === 0) return 0;
  const maxTotal = valuesCount * maxScorePerValue;
  return (memberTotal / maxTotal) * 100;
}

/**
 * Calculate performance score from assessment point
 * Simple average of X and Y positions (already 0-100)
 */
export function calculatePerformanceScore(xPosition: number, yPosition: number): number {
  return (xPosition + yPosition) / 2;
}

/**
 * Calculate maturity score based on M1-M4 level
 * Uses fixed mapping: M1=25%, M2=50%, M3=75%, M4=100%
 */
export type MaturityLevel = 'M1' | 'M2' | 'M3' | 'M4';

export const MATURITY_SCORE_MAP: Record<MaturityLevel, number> = {
  M1: 25,
  M2: 50,
  M3: 75,
  M4: 100,
};

export function calculateMaturityScore(level: MaturityLevel): number {
  return MATURITY_SCORE_MAP[level];
}

/**
 * Get maturity level from X,Y position
 */
export function getMaturityLevelFromPosition(x: number, y: number): MaturityLevel {
  if (x < 50 && y < 50) return 'M4';  // Baixo diretivo + Baixo suporte → Adulto
  if (x >= 50 && y < 50) return 'M1'; // Alto diretivo + Baixo suporte → Bebê
  if (x < 50 && y >= 50) return 'M3'; // Baixo diretivo + Alto suporte → Adolescente
  return 'M2'; // Alto diretivo + Alto suporte → Criança
}

/**
 * Calculate People Performance Index using weighted average
 * Handles missing assessments by recalculating weights proportionally
 */
export function calculatePeoplePerformanceIndex(
  culturalScore: number | null,
  performanceScore: number | null,
  maturityScore: number | null,
  weights: PeoplePerformanceWeights
): { index: number; availableAssessments: number } {
  const scores: { score: number; weight: number }[] = [];

  if (culturalScore !== null) {
    scores.push({ score: culturalScore, weight: weights.cultural });
  }
  if (performanceScore !== null) {
    scores.push({ score: performanceScore, weight: weights.performance });
  }
  if (maturityScore !== null) {
    scores.push({ score: maturityScore, weight: weights.maturity });
  }

  if (scores.length === 0) {
    return { index: 0, availableAssessments: 0 };
  }

  // Recalculate weights proportionally for available scores
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = scores.reduce((sum, s) => sum + (s.score * s.weight / totalWeight), 0);

  return { 
    index: Math.round(weightedSum * 100) / 100, 
    availableAssessments: scores.length 
  };
}

/**
 * Get performance level label based on index
 */
export function getPerformanceLevel(index: number): {
  label: string;
  color: string;
  bgClass: string;
} {
  if (index >= 80) {
    return { label: 'Excelente', color: 'text-green-600', bgClass: 'bg-green-100' };
  }
  if (index >= 60) {
    return { label: 'Bom', color: 'text-blue-600', bgClass: 'bg-blue-100' };
  }
  if (index >= 40) {
    return { label: 'Regular', color: 'text-amber-600', bgClass: 'bg-amber-100' };
  }
  return { label: 'Atenção', color: 'text-red-600', bgClass: 'bg-red-100' };
}
