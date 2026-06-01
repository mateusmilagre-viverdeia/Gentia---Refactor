// Tipos para o módulo Teste QA - Quociente de Adversidade

export type QADimension = 'C' | 'R' | 'A' | 'D';
export type QAProfile = 'alpinista' | 'campista' | 'desistente';
export type QAProfileLevel = 'alto' | 'moderadamente_alto' | 'moderado' | 'moderadamente_baixo' | 'baixo';

export interface QAQuestion {
  id: string;
  event_number: number;
  event_description: string;
  dimension: QADimension;
  question_text: string;
  scale_low_label: string;
  scale_high_label: string;
  is_active: boolean;
  created_at: string;
}

export interface QASession {
  id: string;
  account_id: string | null;
  user_id: string;
  participant_name: string;
  participant_email: string | null;
  team_id: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QAResponse {
  id: string;
  session_id: string;
  question_id: string;
  score: number;
  created_at: string;
}

export interface QAResult {
  id: string;
  session_id: string;
  c_score: number;
  r_score: number;
  a_score: number;
  d_score: number;
  qa_total: number;
  profile: QAProfile;
  profile_level: QAProfileLevel;
  created_at: string;
}

export interface QADimensionInfo {
  key: QADimension;
  name: string;
  fullName: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const QA_DIMENSIONS: Record<QADimension, QADimensionInfo> = {
  C: {
    key: 'C',
    name: 'Controle',
    fullName: 'Controle',
    description: 'Até que ponto você acredita que pode influenciar a situação?',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-500'
  },
  R: {
    key: 'R',
    name: 'Responsabilidade',
    fullName: 'Responsabilidade',
    description: 'Até que ponto você assume responsabilidade por melhorar a situação?',
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    borderColor: 'border-green-500'
  },
  A: {
    key: 'A',
    name: 'Alcance',
    fullName: 'Alcance',
    description: 'Até que ponto a situação afeta outras áreas da vida ou trabalho?',
    color: 'text-amber-600',
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-500'
  },
  D: {
    key: 'D',
    name: 'Duração',
    fullName: 'Duração',
    description: 'Até que ponto as consequências da situação irão durar?',
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    borderColor: 'border-red-500'
  }
};

export interface QAProfileInfo {
  key: QAProfile;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export const QA_PROFILES: Record<QAProfile, QAProfileInfo> = {
  alpinista: {
    key: 'alpinista',
    name: 'Alpinista',
    emoji: '🧗',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500',
    borderColor: 'border-emerald-500',
    description: 'Alta percepção de controle e responsabilidade. Vê adversidade como desafio. Forte potencial de crescimento e liderança.'
  },
  campista: {
    key: 'campista',
    name: 'Campista',
    emoji: '⛺',
    color: 'text-amber-600',
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-500',
    description: 'Resiliência moderada. Consegue lidar com adversidade, mas evita desafios maiores. Zona de conforto elevada.'
  },
  desistente: {
    key: 'desistente',
    name: 'Desistente',
    emoji: '🏳️',
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    borderColor: 'border-red-500',
    description: 'Baixa percepção de controle. Alta sensação de impacto e duração. Maior risco de desengajamento.'
  }
};

export interface QAProfileLevelInfo {
  key: QAProfileLevel;
  name: string;
  minScore: number;
  maxScore: number;
  profile: QAProfile;
  description: string;
}

export const QA_PROFILE_LEVELS: QAProfileLevelInfo[] = [
  { key: 'alto', name: 'Alto', minScore: 80, maxScore: 100, profile: 'alpinista', description: 'AQ muito alto – responde bem sob pressão, supera adversidades de todas as magnitudes.' },
  { key: 'moderadamente_alto', name: 'Moderadamente Alto', minScore: 60, maxScore: 79, profile: 'alpinista', description: 'AQ saudável – resiliência funcional, persevera quando confrontado com adversidades.' },
  { key: 'moderado', name: 'Moderado', minScore: 40, maxScore: 59, profile: 'campista', description: 'AQ médio – sabe lidar com dificuldades, mas risco de travamento sob pressão constante.' },
  { key: 'moderadamente_baixo', name: 'Moderadamente Baixo', minScore: 30, maxScore: 39, profile: 'desistente', description: 'AQ baixo-moderado – lida com alguns contratempos, mas pode sentir-se sobrecarregado.' },
  { key: 'baixo', name: 'Baixo', minScore: 20, maxScore: 29, profile: 'desistente', description: 'AQ baixo – padrão de vitimização, desenvolvimento de resiliência é fortemente recomendado.' },
];

// Constantes de cálculo - Modelo CORE Oficial (escala 20-100)
export const QA_QUESTIONS_PER_DIMENSION = 5; // 20 eventos × 1 pergunta = 20, dividido por 4 dimensões = 5
export const QA_MIN_DIMENSION_SCORE = 5; // 5 perguntas × 1 ponto mínimo
export const QA_MAX_DIMENSION_SCORE = 25; // 5 perguntas × 5 pontos máximo
export const QA_MAX_TOTAL = 100; // C + O + R + E = 25 + 25 + 25 + 25 = 100

// Helpers
export function getProfileFromScore(qaTotal: number): { profile: QAProfile; level: QAProfileLevel } {
  const levelInfo = QA_PROFILE_LEVELS.find(
    l => qaTotal >= l.minScore && qaTotal <= l.maxScore
  );
  
  if (!levelInfo) {
    return { profile: 'desistente', level: 'baixo' };
  }
  
  return { profile: levelInfo.profile, level: levelInfo.key };
}

export function getLevelInfo(level: QAProfileLevel): QAProfileLevelInfo | undefined {
  return QA_PROFILE_LEVELS.find(l => l.key === level);
}

export function getDimensionStrength(score: number, maxPossible: number = 50): 'baixo' | 'moderado' | 'alto' {
  const percentage = (score / maxPossible) * 100;
  if (percentage >= 70) return 'alto';
  if (percentage >= 40) return 'moderado';
  return 'baixo';
}

export interface QAEventGroup {
  eventNumber: number;
  eventDescription: string;
  questions: QAQuestion[];
}

export function groupQuestionsByEvent(questions: QAQuestion[]): QAEventGroup[] {
  const groups: Map<number, QAEventGroup> = new Map();
  
  questions.forEach(q => {
    if (!groups.has(q.event_number)) {
      groups.set(q.event_number, {
        eventNumber: q.event_number,
        eventDescription: q.event_description,
        questions: []
      });
    }
    groups.get(q.event_number)!.questions.push(q);
  });
  
  return Array.from(groups.values()).sort((a, b) => a.eventNumber - b.eventNumber);
}
