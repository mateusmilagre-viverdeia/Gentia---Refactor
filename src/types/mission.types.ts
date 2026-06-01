export interface MissionAnswer {
  questionNumber: number;
  answerText: string;
  updatedAt: string;
}

export interface MissionPillarRating {
  rating: 'Forte' | 'Médio' | 'Fraco';
  explanation: string;
}

export interface MissionAnalysis {
  id: string;
  sessionId: string;
  missionStatement: string;
  keywords: string[];
  insights: string[];
  notes: string;
  createdAt: string;
  // V2 analysis fields
  score?: number;
  diagnosis?: string;
  pillars?: {
    purpose: MissionPillarRating;
    clarity: MissionPillarRating;
    impact: MissionPillarRating;
  };
  lengthFeedback?: string;
  recommendations?: string[];
  benchmarks?: string;
}

export interface MissionSession {
  id: string;
  userId: string;
  stage: number; // 1-9 para wizard v2, 1-8 para wizard v1, 14 para review, 15 para processing, 16 para summary
  answers: Record<number, string>;
  analysis: MissionAnalysis | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  questionnaireVersion: 1 | 2;
  segment?: 'industry' | 'services' | 'product';
}

export interface MissionVersionHistoryItem {
  id: string;
  missionStatement: string;
  timestamp: string;
  variant: 'original' | 'shorter' | 'alternative' | 'backup_v1' | 'manual';
}

export interface MissionStorage {
  session: MissionSession;
  versionHistory: MissionVersionHistoryItem[];
}

// Estrutura das perguntas v2
export interface MissionQuestionV2 {
  number: number;
  layer: 1 | 2 | 3;
  layerTitle: string;
  question: string;
  observation: string;
  examples?: string[];
  requiresSegment?: boolean;
  segmentVersions?: {
    industry: { question: string; observation: string; examples: string[] };
    services: { question: string; observation: string; examples: string[] };
    product: { question: string; observation: string; examples: string[] };
  };
}
