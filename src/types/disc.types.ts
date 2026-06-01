// =============================================
// DISC Assessment Types
// =============================================

export type DISCDimension = 'D' | 'I' | 'S' | 'C';

export interface DISCQuestion {
  id: string;
  dimension: DISCDimension;
  question_number: number;
  question_text: string;
  is_reverse_scored: boolean;
  is_active: boolean;
  created_at: string;
}

export interface DISCSession {
  id: string;
  account_id: string | null;
  user_id: string;
  participant_name: string;
  participant_email: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DISCResponse {
  id: string;
  session_id: string;
  question_id: string;
  score: number; // 1-5
  created_at: string;
}

export interface DISCResult {
  id: string;
  session_id: string;
  
  // Raw scores (8-40 per dimension)
  d_score: number;
  i_score: number;
  s_score: number;
  c_score: number;
  
  // Normalized scores (0-100)
  d_normalized: number;
  i_normalized: number;
  s_normalized: number;
  c_normalized: number;
  
  // Profile identification
  primary_profile: DISCDimension;
  secondary_profile: DISCDimension | null;
  
  // Intensity of primary profile
  intensity: 'baixa' | 'média' | 'alta';
  
  // Balance indicator
  is_balanced: boolean;
  
  created_at: string;
}

// =============================================
// DISC Dimension Metadata
// =============================================

export interface DISCDimensionInfo {
  key: DISCDimension;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  traits: string[];
}

export const DISC_DIMENSIONS: Record<DISCDimension, DISCDimensionInfo> = {
  D: {
    key: 'D',
    name: 'Dominância',
    description: 'Foco em resultados, desafios e ação direta',
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    traits: ['Decisivo', 'Competitivo', 'Orientado a resultados', 'Direto', 'Independente']
  },
  I: {
    key: 'I',
    name: 'Influência',
    description: 'Foco em pessoas, entusiasmo e colaboração',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
    traits: ['Comunicativo', 'Entusiasmado', 'Persuasivo', 'Otimista', 'Sociável']
  },
  S: {
    key: 'S',
    name: 'Estabilidade',
    description: 'Foco em cooperação, sinceridade e confiabilidade',
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    traits: ['Paciente', 'Leal', 'Confiável', 'Calmo', 'Bom ouvinte']
  },
  C: {
    key: 'C',
    name: 'Conformidade',
    description: 'Foco em qualidade, precisão e competência',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    traits: ['Analítico', 'Preciso', 'Sistemático', 'Cauteloso', 'Detalhista']
  }
};

// =============================================
// Scoring Configuration
// =============================================

// Score de resposta: 1-5 (discordo totalmente → concordo totalmente)
export const RESPONSE_SCALE = {
  1: 'Discordo totalmente',
  2: 'Discordo',
  3: 'Neutro',
  4: 'Concordo',
  5: 'Concordo totalmente'
} as const;

// Número de perguntas por dimensão
export const QUESTIONS_PER_DIMENSION = 8;

// Score mínimo e máximo por dimensão (8 perguntas * 1 ou 5)
export const MIN_DIMENSION_SCORE = 8;
export const MAX_DIMENSION_SCORE = 40;

// Thresholds para intensidade (baseado em score normalizado 0-100)
export const INTENSITY_THRESHOLDS = {
  baixa: { min: 0, max: 40 },
  média: { min: 41, max: 70 },
  alta: { min: 71, max: 100 }
} as const;

// Diferença máxima entre scores para considerar "equilibrado"
export const BALANCE_THRESHOLD = 10; // pontos normalizados

// =============================================
// AI Analysis Types
// =============================================

export type DISCAnalysisLevel = 'collaborator' | 'leader' | 'system';

export interface DISCDevelopmentPlan {
  immediate: string[];  // Esta semana
  shortTerm: string[];  // Este mês
  longTerm: string[];   // Próximo trimestre
}

export interface DISCAIAnalysis {
  level: DISCAnalysisLevel;
  executiveSummary: string;
  leadershipStyle: string;
  motivationEngagement: string;
  risksBlindSpots: string;
  communication: string;
  idealEnvironment: string;
  developmentPlan: DISCDevelopmentPlan;
}

// Saída para sistema (estruturada)
export interface DISCSystemOutput {
  profileCode: string;        // ex: "D/C"
  intensity: 'low' | 'medium' | 'high';
  isBalanced: boolean;
  scores: {
    D: number;
    I: number;
    S: number;
    C: number;
  };
  topStrengths: string[];
  topRisks: string[];
  compatibilityWith: Record<DISCDimension, 'high' | 'medium' | 'low'>;
}

export interface DISCAnalysisRequest {
  sessionId: string;
  analysisLevel: DISCAnalysisLevel;
}

// =============================================
// Team Dashboard Types
// =============================================

export interface DISCTeamMember {
  sessionId: string;
  participantName: string;
  participantEmail: string | null;
  primaryProfile: DISCDimension;
  secondaryProfile: DISCDimension | null;
  intensity: 'baixa' | 'média' | 'alta';
  isBalanced: boolean;
  scores: {
    D: number;
    I: number;
    S: number;
    C: number;
  };
  completedAt: string;
}

export interface DISCTeamAggregation {
  teamId: string;
  teamName: string;
  memberCount: number;
  completedAssessments: number;
  
  // Average normalized scores (0-100)
  avgScores: {
    D: number;
    I: number;
    S: number;
    C: number;
  };
  
  // Distribution of primary profiles (count)
  profileDistribution: {
    D: number;
    I: number;
    S: number;
    C: number;
  };
  
  // Individual members data
  members: DISCTeamMember[];
  
  // Last assessment date
  lastAssessmentDate: string | null;
}

export interface DISCTeamAnalysis {
  strengths: string[];
  risks: string[];
  gaps: DISCDimension[];
  recommendations: string[];
}
