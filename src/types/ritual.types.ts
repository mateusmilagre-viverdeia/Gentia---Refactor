export type WorkModel = 'presencial' | 'hibrido' | 'remoto';

export const WORK_MODELS: { value: WorkModel; label: string; icon: string; description: string }[] = [
  { value: 'presencial', label: '100% Presencial', icon: '🏢', description: 'Todos trabalham no escritório diariamente' },
  { value: 'hibrido', label: 'Híbrido', icon: '🔄', description: 'Combina dias presenciais e remotos' },
  { value: 'remoto', label: '100% Home Office', icon: '🏠', description: 'Todos trabalham remotamente' },
];

export interface ApprovedRitual {
  id: string;
  text: string;
  source: 'management' | 'ai_recommendation' | 'pillar' | 'final_analysis';
  sourceLabel: string;
  pillarNumber?: number;
  duration?: string;
  frequency?: string;
}

export interface RitualSession {
  id: string;
  user_id: string;
  stage: number;
  work_model?: string;
  management_rituals?: string[];
  ai_management_recommendations?: AIManagementRecommendation[];
  ai_final_recommendations?: AIManagementRecommendation[];
  approved_rituals?: ApprovedRitual[];
  created_at: string;
  updated_at: string;
}

export interface RitualItem {
  id: string;
  session_id: string;
  pillar_number: number;
  item_text: string;
  source: string;
  created_at: string;
}

export type RitualDuration = 'rapido' | 'medio' | 'longo';
export type RitualComplexity = 'facil' | 'complexo';
export type RitualFormat = 'sincrono' | 'assincrono';

export interface RitualSuggestion {
  id: string;
  pillar_number: number;
  suggestion_text: string;
  active: boolean;
  duration?: RitualDuration | null;
  complexity?: RitualComplexity | null;
  format?: RitualFormat | null;
  work_model_tags?: string[] | null;
}

export interface RitualPillar {
  number: number;
  title: string;
  question: string;
  icon: string;
}

export type ManagementRitualLevel = 'estrategico' | 'tatico' | 'operacional';

export const FREQUENCY_OPTIONS_DEFAULT: string[] = [
  'Diária',
  '2x na semana',
  '3x na semana',
  'Semanal',
  'Quinzenal',
  'Mensal',
  'Bimensal',
  'Trimestral',
  'Semestral',
  'Anual',
  'Outro',
];

export const FREQUENCY_BY_LEVEL: Record<ManagementRitualLevel, string[]> = {
  operacional: FREQUENCY_OPTIONS_DEFAULT,
  tatico: FREQUENCY_OPTIONS_DEFAULT,
  estrategico: FREQUENCY_OPTIONS_DEFAULT,
};

export interface ManagementRitual {
  id: string;
  name: string;
  level: ManagementRitualLevel;
  duration: string;
  frequency: string;
  description: string;
  icon: string;
}

export interface AIManagementRecommendation {
  id: string;
  ritualId?: string;
  ritualName?: string;
  suggestion: string;
  pillarRelated?: string;
  durationSuggested?: string;
  accepted: boolean;
}

export const MANAGEMENT_RITUAL_LEVELS: Record<ManagementRitualLevel, { label: string; color: string }> = {
  estrategico: { label: 'Estratégico', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  tatico: { label: 'Tático', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  operacional: { label: 'Operacional', color: 'bg-green-100 text-green-800 border-green-300' },
};

export const MANAGEMENT_RITUALS: ManagementRitual[] = [
  // Estratégico
  {
    id: 'reuniao-diretoria',
    name: 'Reunião de Diretoria',
    level: 'estrategico',
    duration: '90-120 min',
    frequency: 'Mensal ou Quinzenal',
    description: 'Encontro periódico da alta liderança para decisões estratégicas, revisão de indicadores-chave e alinhamento institucional.',
    icon: '👔',
  },
  {
    id: 'reuniao-semanal-resultados',
    name: 'Reunião Semanal de Resultados',
    level: 'estrategico',
    duration: '60 min',
    frequency: 'Semanal',
    description: 'Análise dos resultados semanais com foco em indicadores de performance, metas e desvios que demandam ação.',
    icon: '📊',
  },
  {
    id: 'comite-projetos-estrategicos',
    name: 'Comitê de Projetos Estratégicos',
    level: 'estrategico',
    duration: '60-90 min',
    frequency: 'Quinzenal ou Mensal',
    description: 'Acompanhamento e priorização dos projetos ligados ao planejamento estratégico da organização.',
    icon: '🎯',
  },
  {
    id: 'sop-business-review',
    name: 'S&OP / Business Review',
    level: 'estrategico',
    duration: '90-120 min',
    frequency: 'Mensal',
    description: 'Reunião de planejamento integrado entre comercial, operações, financeiro e supply para balancear demanda e capacidade.',
    icon: '📈',
  },
  {
    id: 'qbr-revisao-trimestral',
    name: 'QBR — Revisão Trimestral',
    level: 'estrategico',
    duration: '120-180 min',
    frequency: 'Trimestral',
    description: 'Revisão profunda dos resultados trimestrais, realinhamento de estratégia e definição de prioridades do próximo ciclo.',
    icon: '📋',
  },
  {
    id: 'revisao-planejamento-estrategico',
    name: 'Revisão do Planejamento Estratégico',
    level: 'estrategico',
    duration: '180+ min (pode ser um dia)',
    frequency: 'Semestral ou Anual',
    description: 'Reavaliação da visão, missão, objetivos estratégicos e roadmap de longo prazo com a liderança sênior.',
    icon: '🗺️',
  },
  // Tático
  {
    id: 'reuniao-gestao-lideres',
    name: 'Reunião de Gestão com Líderes',
    level: 'tatico',
    duration: '60-90 min',
    frequency: 'Semanal ou Quinzenal',
    description: 'Encontro entre gestores para alinhar prioridades, resolver interdependências e cascatear decisões estratégicas.',
    icon: '🤝',
  },
  {
    id: 'all-hands',
    name: 'All Hands / Town Hall',
    level: 'tatico',
    duration: '45-60 min',
    frequency: 'Mensal ou Trimestral',
    description: 'Reunião geral da empresa para compartilhar resultados, atualizações estratégicas e reforçar a cultura organizacional.',
    icon: '🏛️',
  },
  {
    id: 'one-on-one',
    name: 'One-on-One (Gestor ↔ Liderado)',
    level: 'tatico',
    duration: '30-45 min',
    frequency: 'Semanal ou Quinzenal',
    description: 'Conversa individual entre gestor e liderado focada em desenvolvimento, feedback, desbloqueios e alinhamento de expectativas.',
    icon: '💬',
  },
  {
    id: 'revisao-metas-area',
    name: 'Revisão de Metas por Área',
    level: 'tatico',
    duration: '60 min',
    frequency: 'Mensal',
    description: 'Revisão do progresso das metas de cada área, análise de gaps e definição de planos de ação corretivos.',
    icon: '🎯',
  },
  {
    id: 'calibracao-performance',
    name: 'Calibração de Performance',
    level: 'tatico',
    duration: '90-120 min',
    frequency: 'Semestral',
    description: 'Sessão entre líderes para calibrar avaliações de desempenho, garantir equidade e consistência nas classificações.',
    icon: '⚖️',
  },
  {
    id: 'avaliacao-desempenho',
    name: 'Avaliação de Desempenho',
    level: 'tatico',
    duration: '45-60 min por pessoa',
    frequency: 'Semestral ou Anual',
    description: 'Processo formal de avaliação de resultados e competências do colaborador com feedback estruturado e plano de desenvolvimento.',
    icon: '📝',
  },
  // Operacional
  {
    id: 'daily-receita',
    name: 'Daily de Receita / Vendas',
    level: 'operacional',
    duration: '15-20 min',
    frequency: 'Diário',
    description: 'Ritual rápido de acompanhamento diário de pipeline, oportunidades e ações comerciais prioritárias.',
    icon: '💰',
  },
  {
    id: 'daily-dds',
    name: 'Daily / DDS (outras áreas)',
    level: 'operacional',
    duration: '10-15 min',
    frequency: 'Diário',
    description: 'Alinhamento diário rápido da equipe: o que foi feito, o que será feito hoje e impedimentos.',
    icon: '🔄',
  },
  {
    id: 'reuniao-equipe',
    name: 'Reunião de Equipe / Squad',
    level: 'operacional',
    duration: '30-60 min',
    frequency: 'Semanal',
    description: 'Encontro semanal do time para revisar entregas, alinhar tarefas e resolver questões operacionais.',
    icon: '👥',
  },
  {
    id: 'pdca-troubleshoot',
    name: 'PDCA Rápido / Troubleshoot',
    level: 'operacional',
    duration: '30-45 min',
    frequency: 'Sob demanda (semanal)',
    description: 'Sessão ágil para resolver problemas específicos usando ciclo PDCA, focada em causa raiz e ação imediata.',
    icon: '🔧',
  },
  {
    id: 'fechamento-mensal',
    name: 'Fechamento Mensal',
    level: 'operacional',
    duration: '60-90 min',
    frequency: 'Mensal',
    description: 'Ritual de encerramento do mês com revisão de KPIs, aprendizados, reconhecimentos e planejamento do próximo ciclo.',
    icon: '📅',
  },
  {
    id: 'retrospectiva-operacional',
    name: 'Retrospectiva Operacional',
    level: 'operacional',
    duration: '45-60 min',
    frequency: 'Quinzenal ou Mensal',
    description: 'Sessão de melhoria contínua: o que funcionou, o que precisa melhorar e ações de ajuste para o próximo ciclo.',
    icon: '🔍',
  },
];

// Stages: 0=Intro, 1=ManagementSelection, 2=AIRecommendations, 3-5=Pillars(3), 6=FinalAnalysis, 7=Review, 8=Summary
export const RITUAL_PILLARS: RitualPillar[] = [
  { 
    number: 1, 
    title: "Artefatos", 
    question: "Quais símbolos, sistemas e elementos precisamos incluir ou alterar para reforçar a cultura da empresa?", 
    icon: "🏛️" 
  },
  { 
    number: 2, 
    title: "Ideias Adicionais e Símbolos", 
    question: "Quais ideias adicionais, símbolos e elementos criativos podem reforçar a cultura da empresa?", 
    icon: "💡" 
  },
  { 
    number: 3, 
    title: "Rituais de Alinhamento com Valores", 
    question: "Quais rituais reforçam os valores da empresa?", 
    icon: "💎" 
  },
];

export interface StageInstruction {
  title: string;
  description: string;
  icon: string;
}

export const STAGE_INSTRUCTIONS: Record<number, StageInstruction> = {
  0: {
    title: 'Bem-vindo aos Rituais de Cultura',
    description: 'Neste módulo, você vai construir os rituais que irão sustentar e fortalecer a cultura da sua empresa no dia a dia. O processo começa com um levantamento dos rituais de gestão que sua empresa já pratica, para que possamos incorporar cultura dentro do que já existe.',
    icon: '🚀',
  },
  1: {
    title: 'Rituais de Gestão Existentes',
    description: 'Selecione os rituais de gestão que sua empresa já pratica atualmente. Isso é fundamental para que a IA consiga recomendar como inserir cultura dentro dos rituais já existentes, sem criar reuniões extras desnecessárias.',
    icon: '📋',
  },
  2: {
    title: 'Recomendações da IA',
    description: 'Com base nos 8 pilares da cultura da sua empresa e nos rituais de gestão selecionados, a IA cruzou as informações e gerou recomendações personalizadas. A ideia é sempre incorporar cultura dentro dos rituais existentes — usando de 10% a 20% do tempo para falar sobre 1 pilar de cultura por reunião.',
    icon: '🤖',
  },
  3: {
    title: 'Pilar 1 — Artefatos',
    description: 'Artefatos são os símbolos visíveis da cultura: logotipos, slogans, ambiente físico, dress code, linguagem, sistemas e processos. Defina quais artefatos precisam ser criados, ajustados ou eliminados para reforçar a cultura desejada.',
    icon: '🏛️',
  },
  4: {
    title: 'Pilar 2 — Ideias Adicionais e Símbolos',
    description: 'Aqui você define ideias adicionais, símbolos e elementos criativos que podem reforçar a cultura da empresa de formas inovadoras e memoráveis.',
    icon: '💡',
  },
  5: {
    title: 'Pilar 3 — Rituais de Alinhamento com Valores',
    description: 'Rituais específicos que reforçam os valores da empresa. Podem ser dinâmicas, reconhecimentos, celebrações ou momentos dedicados a vivenciar os valores no dia a dia.',
    icon: '💎',
  },
  6: {
    title: 'Análise Final da IA',
    description: 'A IA compilou todas as informações do processo — rituais de gestão, recomendações aceitas e os 3 pilares — para sugerir iniciativas finais de alto impacto. O foco é simplicidade: poucas ações, dentro dos rituais existentes.',
    icon: '🧠',
  },
  7: {
    title: 'Revisão Final',
    description: 'Selecione até 10 rituais para aprovação final. Esses serão os rituais de cultura oficiais da sua empresa. Este é o momento de afunilar e escolher apenas os mais relevantes.',
    icon: '✅',
  },
  8: {
    title: 'Resumo dos Rituais de Cultura',
    description: 'Parabéns! Aqui está o resumo completo dos rituais de cultura definidos para sua empresa. Exporte em PDF e comece a implementar.',
    icon: '🎉',
  },
};
