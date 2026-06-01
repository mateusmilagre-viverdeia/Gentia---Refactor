export interface ValuesQuestionsSession {
  id: string;
  account_id: string;
  user_id: string;
  stage: number;
  working_values: string[];
  created_at: string;
  updated_at: string;
}

export interface ValuesQuestionItem {
  id: string;
  session_id: string;
  stage_number: number;
  value_label: string | null;
  question_text: string;
  source: 'catalog' | 'ai' | 'custom';
  position: number | null;
  requires_thinking_time?: boolean;
  created_at: string;
}

export interface ValuesQuestionsCatalogItem {
  id: string;
  stage_number: number;
  value_label: string | null;
  question_text: string;
  active: boolean;
  created_at: string;
}

export interface ValuesQuestionsVersionHistory {
  id: string;
  session_id: string;
  snapshot: {
    items: ValuesQuestionItem[];
    working_values: string[];
  };
  variant: string;
  created_at: string;
}

export interface VersionHistoryEntry {
  id: string;
  variant: string;
  created_at: string;
  snapshot: {
    items: ValuesQuestionItem[];
    working_values: string[];
  };
}

// Value aliases for matching catalog questions to company values
export const VALUE_ALIASES: Record<string, string[]> = {
  'Gratidão': ['Gratidão', 'Agradecimento'],
  'Resultado': ['Resultado', 'Resultados', 'Equilíbrio', 'Resultado e Equilíbrio'],
  'Melhoria Contínua': ['Melhoria Contínua', 'Mentalidade de Crescimento', 'Desenvolvimento', 'Autodesenvolvimento', 'Crescimento'],
  'Transparência': ['Transparência', 'Jogar o jogo abertamente', 'Transparência com Respeito'],
  'Liberdade': ['Liberdade', 'Liberdade com Responsabilidade', 'Autonomia'],
  'Satisfação do Cliente': ['Satisfação do Cliente', 'Cliente é REI', 'Foco no Cliente', 'Cliente'],
  'Ética': ['Ética', 'Integridade'],
  'Senso de Dono': ['Senso de Dono', 'Atitude de Dono', 'Ownership'],
  'Trabalho em Equipe': ['Trabalho em Equipe', 'Colaboração', 'Família', 'Espírito de Equipe', 'Cooperação'],
  'Inovação': ['Inovação', 'Criatividade'],
  'Resiliência': ['Resiliência', 'Superação', 'Persistência'],
  'Qualidade': ['Qualidade', 'Excelência'],
  'Segurança': ['Segurança'],
  'Servir': ['Servir', 'Serviço'],
  'Iniciativa': ['Iniciativa', 'Proatividade'],
  'Honestidade': ['Honestidade'],
  'Comprometimento': ['Comprometimento', 'Responsabilidade', 'Accountability'],
};

export function findCatalogValueLabel(companyValue: string): string | null {
  const normalizedValue = companyValue.toLowerCase().trim();
  
  for (const [catalogLabel, aliases] of Object.entries(VALUE_ALIASES)) {
    if (aliases.some(alias => alias.toLowerCase() === normalizedValue)) {
      return catalogLabel;
    }
  }
  
  return null;
}
