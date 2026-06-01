export interface VisionAnswer {
  questionNumber: number;
  answerText: string;
  updatedAt: string;
}

export interface VisionAnalysis {
  id: string;
  sessionId: string;
  visionInspirational: string;
  visionMeasurable: string;
  keywords: string[];
  insights: string[];
  createdAt: string;
}

export interface VisionSession {
  id: string;
  userId: string;
  stage: number; // 1-10 para wizard, 11 para review, 12 para processing, 13 para summary
  answers: Record<number, string>;
  analysis: VisionAnalysis | null;
  notes: string;
  selectedVisionType?: 'inspirational' | 'measurable';
  finalVision?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VersionHistoryItem {
  id: string;
  visionInspirational: string;
  visionMeasurable: string;
  timestamp: string;
  variant: 'original' | 'shorter' | 'alternative' | 'short-term' | 'manual';
}

export interface VisionStorage {
  session: VisionSession;
  versionHistory: VersionHistoryItem[];
}
