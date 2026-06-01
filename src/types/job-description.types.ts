export interface JobDescription {
  id: string;
  account_id: string;
  org_node_id: string | null;
  status: 'draft' | 'in_progress' | 'approved' | 'archived';
  area: string | null;
  title: string;
  mission: string | null;
  indicators: string[];
  responsibilities: string[];
  required_skills: string[];
  desired_skills: string[];
  behavioral_competencies: string[];
  development: string[];
  benefits: string[];
  custom_fields: CustomField[];
  wizard_step: number;
  ai_suggestions: Record<string, unknown>;
  ideal_disc_profile: IdealDiscProfile | null;
  created_at: string;
  updated_at: string;
}

export interface IdealDiscProfile {
  d: number;
  i: number;
  s: number;
  c: number;
  description: string;
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'list';
  value: string | string[];
}

export interface JobDescriptionFormData {
  title: string;
  mission: string;
  indicators: string[];
  responsibilities: string[];
  required_skills: string[];
  desired_skills: string[];
  behavioral_competencies: string[];
  development: string[];
  benefits: string[];
  custom_fields: CustomField[];
  area: string;
}

export interface WizardStep {
  id: number;
  field: keyof JobDescriptionFormData | 'review';
  title: string;
  description: string;
  type: 'text' | 'textarea' | 'list' | 'review';
  required: boolean;
  maxItems?: number;
  placeholder?: string;
  aiEnabled?: boolean;
}

export const JOB_DESCRIPTION_WIZARD_STEPS: WizardStep[] = [
  {
    id: 1,
    field: 'title',
    title: 'Nome do Cargo',
    description: 'Qual é o título/nome do cargo?',
    type: 'text',
    required: true,
    placeholder: 'Ex: Head de Marketing',
  },
  {
    id: 2,
    field: 'mission',
    title: 'Missão do Cargo',
    description: 'Qual é a missão principal deste cargo?',
    type: 'textarea',
    required: true,
    placeholder: 'Descreva o propósito e missão do cargo...',
    aiEnabled: true,
  },
  {
    id: 3,
    field: 'indicators',
    title: 'Indicadores de Responsabilidade',
    description: 'Quais indicadores estão sob responsabilidade deste cargo?',
    type: 'list',
    required: false,
    maxItems: 10,
    placeholder: 'Ex: Taxa de conversão de leads',
    aiEnabled: true,
  },
  {
    id: 4,
    field: 'responsibilities',
    title: 'Principais Responsabilidades',
    description: 'Quais são as principais responsabilidades do cargo?',
    type: 'list',
    required: true,
    maxItems: 10,
    placeholder: 'Ex: Gerenciar equipe de vendas',
  },
  {
    id: 5,
    field: 'required_skills',
    title: 'Competências Técnicas Obrigatórias',
    description: 'Quais competências técnicas são obrigatórias?',
    type: 'list',
    required: true,
    maxItems: 3,
    placeholder: 'Ex: Excel avançado',
    aiEnabled: true,
  },
  {
    id: 6,
    field: 'desired_skills',
    title: 'Competências Técnicas Desejáveis',
    description: 'Quais competências técnicas são desejáveis?',
    type: 'list',
    required: false,
    maxItems: 5,
    placeholder: 'Ex: Conhecimento em CRM',
    aiEnabled: true,
  },
  {
    id: 7,
    field: 'behavioral_competencies',
    title: 'Competências Comportamentais',
    description: 'Quais comportamentos são importantes para este cargo?',
    type: 'list',
    required: true,
    placeholder: 'Ex: Liderança, Proatividade',
    aiEnabled: true,
  },
  {
    id: 8,
    field: 'development',
    title: 'O Que Você Vai Desenvolver',
    description: 'O que o profissional vai desenvolver/aprender neste cargo? (opcional)',
    type: 'list',
    required: false,
    placeholder: 'Ex: Liderança estratégica, Gestão de equipes',
    aiEnabled: true,
  },
  {
    id: 9,
    field: 'benefits',
    title: 'Benefícios',
    description: 'O que o profissional ganha ao integrar o time?',
    type: 'list',
    required: false,
    placeholder: 'Ex: 🎓 Treinamentos constantes',
    aiEnabled: true,
  },
  {
    id: 10,
    field: 'review',
    title: 'Revisão Final',
    description: 'Revise todas as informações antes de aprovar',
    type: 'review',
    required: true,
  },
];

export const STATUS_CONFIG = {
  draft: { label: 'Rascunho', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-800' },
  archived: { label: 'Arquivado', color: 'bg-gray-100 text-gray-800' },
};
