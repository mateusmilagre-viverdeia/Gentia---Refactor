export type EventFormat = 'presencial' | 'online' | 'hibrido';
export type ItemSource = 'ai' | 'suggestion' | 'custom';

export interface EventSession {
  id: string;
  user_id: string;
  event_format: EventFormat | null;
  stage: number; // 0=pergunta inicial, 1-9=pilares, 10=revisão, 11=sumário
  created_at: string;
  updated_at: string;
}

export interface EventItem {
  id: string;
  session_id: string;
  pillar_number: number;
  item_text: string;
  source: ItemSource;
  created_at: string;
}

export interface EventSuggestion {
  id: string;
  pillar_number: number;
  suggestion_text: string;
  event_format: EventFormat | null;
  active: boolean;
  created_at: string;
}

export interface EventPillar {
  number: number;
  title: string;
  description: string;
  icon: string;
}

export interface CultureContext {
  mission?: { statement: string; answers: Record<number, string> };
  vision?: { inspirational: string; measurable: string; answers: Record<number, string> };
  values?: { label: string; dos: string[]; donts: string[] }[];
  indicators?: string[];
  projects?: { name: string; perspective: string }[];
  energyRituals?: string[];
  developmentRituals?: string[];
  decisionCriteria?: { question: string; answers: string[] }[];
}

export const EVENT_PILLARS: EventPillar[] = [
  { number: 1, title: "História", description: "Quais são os marcos mais importantes da história da empresa que poderíamos contar?", icon: "📜" },
  { number: 2, title: "Convidados", description: "Quem poderíamos convidar para o evento?", icon: "👥" },
  { number: 3, title: "Brindes e Sorteios", description: "O que podemos dar de brinde ou sortear durante o evento?", icon: "🎁" },
  { number: 4, title: "Artefatos", description: "Representações visíveis que simbolizam a cultura da empresa. Incluem símbolos visuais, políticas, rituais, dresscode, espaços físicos, linguagem, ferramentas e materiais.", icon: "🏛️" },
  { number: 5, title: "Experiência", description: "O que vamos fazer para aumentar a experiência durante e após o evento? (Vídeos, welcome Coffee, happy hour)", icon: "✨" },
  { number: 6, title: "Dinâmicas de Energia", description: "Como promovemos energia antes, durante e depois do evento?", icon: "⚡" },
  { number: 7, title: "Local do Evento", description: "Quais locais poderíamos executar o evento?", icon: "📍" },
  { number: 8, title: "Multiplicadores", description: "Quem seriam nossos embaixadores da nossa cultura?", icon: "🌟" },
  { number: 9, title: "Final Emocional", description: "Como podemos terminar nosso momento o mais emocional possível?", icon: "❤️" }
];
