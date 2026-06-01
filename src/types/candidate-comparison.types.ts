import { DISCDimension } from "@/types/disc.types";

export interface CandidateComparisonData {
  id: string;
  applicationId: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  source?: string | null;
  appliedAt: string;
  currentStage: string;
  timeInPipeline: number; // days
  evaluationsCount: number;
  tags: string[];
  scores: {
    cultural: number | null;
    disc: {
      d: number;
      i: number;
      s: number;
      c: number;
      primary: DISCDimension;
      secondary: DISCDimension | null;
      matchScore: number | null;
    } | null;
    technical: number | null;
    overall: number;
  };
  jobTitle: string;
  jobId: string;
}

export interface ComparisonCriterion {
  key: string;
  label: string;
  type: "score" | "date" | "text" | "number";
  higherIsBetter?: boolean;
}

export interface CandidateComparison {
  candidates: CandidateComparisonData[];
  criteria: ComparisonCriterion[];
  generatedAt: string;
  jobId: string;
  jobTitle: string;
}

export const DEFAULT_COMPARISON_CRITERIA: ComparisonCriterion[] = [
  { key: "scores.overall", label: "Score Geral", type: "score", higherIsBetter: true },
  { key: "scores.cultural", label: "Fit Cultural", type: "score", higherIsBetter: true },
  { key: "scores.disc.matchScore", label: "Match DISC", type: "score", higherIsBetter: true },
  { key: "scores.technical", label: "Avaliação Técnica", type: "score", higherIsBetter: true },
  { key: "timeInPipeline", label: "Dias no Pipeline", type: "number", higherIsBetter: false },
  { key: "evaluationsCount", label: "Avaliações", type: "number", higherIsBetter: true },
];
