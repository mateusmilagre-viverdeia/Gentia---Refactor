export interface TeamMaturityAssessment {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMaturityPoint {
  id: string;
  assessment_id: string;
  first_name: string;
  last_name: string;
  x_position: number; // 0-100 (Comportamento Diretivo: 0=Baixo, 100=Alto)
  y_position: number; // 0-100 (Comportamento de Suporte: 0=Baixo, 100=Alto)
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMaturityVersionHistory {
  id: string;
  assessment_id: string;
  snapshot: {
    points: TeamMaturityPoint[];
  };
  variant: string;
  created_at: string;
}

export type MaturityLevel = 'M1' | 'M2' | 'M3' | 'M4';

export interface MaturityLevelInfo {
  level: MaturityLevel;
  label: string;
  sublabel: string;
  color: string;
  bgClass: string;
  leadershipStyle: string;
  decisionStyle: string;
  behavior: 'diretivo' | 'suportivo';
}

export const MATURITY_CONFIG: Record<MaturityLevel, MaturityLevelInfo> = {
  M1: {
    level: 'M1',
    label: 'Bebê',
    sublabel: 'Alto diretivo + Baixo suporte',
    color: '#B48BB6', // Roxo
    bgClass: 'bg-purple-300',
    leadershipStyle: 'O Líder decide. Dar direção.',
    decisionStyle: 'Eu tomo as decisões',
    behavior: 'diretivo',
  },
  M2: {
    level: 'M2',
    label: 'Criança',
    sublabel: 'Alto diretivo + Alto suporte',
    color: '#A8D5A2', // Verde claro
    bgClass: 'bg-green-300',
    leadershipStyle: 'Dar direção e suporte. Líder decide.',
    decisionStyle: 'Vamos conversar mas eu decido',
    behavior: 'diretivo',
  },
  M3: {
    level: 'M3',
    label: 'Adolescente',
    sublabel: 'Baixo diretivo + Alto suporte',
    color: '#C9877F', // Rosa/Vermelho
    bgClass: 'bg-red-300',
    leadershipStyle: 'Dar suporte. M3 decide.',
    decisionStyle: 'Vamos conversar e decidimos juntos',
    behavior: 'suportivo',
  },
  M4: {
    level: 'M4',
    label: 'Adulto',
    sublabel: 'Baixo diretivo + Baixo suporte',
    color: '#2E5077', // Azul escuro
    bgClass: 'bg-blue-800',
    leadershipStyle: 'Delegar e desafiar.',
    decisionStyle: 'Você toma as decisões',
    behavior: 'suportivo',
  },
};

/**
 * Determina o nível de maturidade baseado na posição no gráfico
 * Eixo X: Comportamento Diretivo (0=Baixo, 100=Alto)
 * Eixo Y: Comportamento de Suporte (0=Baixo, 100=Alto)
 * 
 * Quanto MAIS alto em ambos os eixos, MENOS maduro/adulto a pessoa é.
 * 
 * Quadrantes:
 * - M4 (Adulto): Baixo diretivo (X<50) + Baixo suporte (Y<50) → bottom-left (mais maduro)
 * - M1 (Bebê): Alto diretivo (X>=50) + Baixo suporte (Y<50) → bottom-right
 * - M3 (Adolescente): Baixo diretivo (X<50) + Alto suporte (Y>=50) → top-left
 * - M2 (Criança): Alto diretivo (X>=50) + Alto suporte (Y>=50) → top-right (menos maduro)
 */
export function getMaturityLevelFromPosition(x: number, y: number): MaturityLevel {
  if (x < 50 && y < 50) return 'M4';  // Baixo diretivo + Baixo suporte → Adulto (inferior esquerdo)
  if (x >= 50 && y < 50) return 'M1'; // Alto diretivo + Baixo suporte → Bebê (inferior direito)
  if (x < 50 && y >= 50) return 'M3'; // Baixo diretivo + Alto suporte → Adolescente (superior esquerdo)
  return 'M2'; // Alto diretivo + Alto suporte → Criança (superior direito)
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// AI Analysis Types

export interface TeamMaturityAIAnalysis {
  summary: string;
  distribution: {
    M1: number;
    M2: number;
    M3: number;
    M4: number;
  };
  averageMaturity: MaturityLevel;
  averageMaturityLabel: string;
  leadershipRecommendations: {
    style: string;
    description: string;
  }[];
  gaps: {
    issue: string;
    impact: string;
    recommendation: string;
  }[];
  actionPlan: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  insights: string[];
}

export interface PersonMaturityAIAnalysis {
  personName: string;
  currentLevel: MaturityLevel;
  currentLevelLabel: string;
  leadershipStyle: {
    recommended: string;
    description: string;
    dos: string[];
    donts: string[];
  };
  nextLevel: MaturityLevel | null;
  developmentPath: {
    goal: string;
    actions: string[];
    timeframe: string;
  };
  risks: string[];
  strengths: string[];
}

// Saved AI analysis record
export interface SavedAIAnalysis {
  id: string;
  assessment_id: string;
  point_id: string | null;
  analysis_type: 'team' | 'individual';
  analysis: TeamMaturityAIAnalysis | PersonMaturityAIAnalysis;
  position_snapshot: Record<string, unknown>;
  created_at: string;
}
