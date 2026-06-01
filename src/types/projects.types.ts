export type Segment = 'industria' | 'servicos' | 'produto';

export interface ProjectSuggestion {
  id: string;
  name: string;
}

export interface StrategicProject {
  id: string;
  user_id: string;
  project_name: string;
  description?: string | null;
  perspective: PerspectiveId;
  is_custom: boolean;
  segment?: Segment | null;
  importance?: string | null;
  linked_indicator?: string[] | null;
  responsible?: string | null;
  involved_members?: string[] | null;
  start_quarter?: string | null;
  created_at: string;
  updated_at: string;
}

export const SEGMENTS = [
  {
    id: 'industria' as const,
    name: 'Indústria',
    icon: '🏭',
    description: 'Manufatura, produção e fabricação'
  },
  {
    id: 'servicos' as const,
    name: 'Serviços',
    icon: '💼',
    description: 'Consultorias, SaaS e serviços profissionais'
  },
  {
    id: 'produto' as const,
    name: 'Produto / Varejo',
    icon: '🛒',
    description: 'Comércio, e-commerce e varejo físico'
  }
] as const;

export const PERSPECTIVES = [
  {
    id: 'financial' as const,
    title: '💰 Financeira',
    icon: '💰',
    color: 'bg-blue-500/10 text-blue-700 border-blue-500/20'
  },
  {
    id: 'customer' as const,
    title: '👥 Clientes',
    icon: '👥',
    color: 'bg-green-500/10 text-green-700 border-green-500/20'
  },
  {
    id: 'process' as const,
    title: '⚙️ Processos Internos',
    icon: '⚙️',
    color: 'bg-orange-500/10 text-orange-700 border-orange-500/20'
  },
  {
    id: 'people' as const,
    title: '🎓 Aprendizado e Crescimento',
    icon: '🎓',
    color: 'bg-purple-500/10 text-purple-700 border-purple-500/20'
  }
] as const;

export type PerspectiveId = typeof PERSPECTIVES[number]['id'];

export const QUARTERS = [
  { value: 'Q1', label: 'Q1 - Jan a Mar' },
  { value: 'Q2', label: 'Q2 - Abr a Jun' },
  { value: 'Q3', label: 'Q3 - Jul a Set' },
  { value: 'Q4', label: 'Q4 - Out a Dez' }
] as const;
