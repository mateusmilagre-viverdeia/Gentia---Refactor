export type Segment = 'industria' | 'servicos' | 'produto';
export type Perspective = 'financeira' | 'clientes' | 'processos' | 'aprendizado';

export interface VersionHistory {
  id: string;
  snapshot: unknown;
  variant: string;
  created_at: string;
}

export interface IndicatorSession {
  id: string;
  user_id: string;
  segment: Segment;
  selected_step1: Record<Perspective, string[]>;
  final_selection: string[];
  stage: number;
  created_at: string;
  updated_at: string;
}

export interface PerspectiveConfig {
  key: Perspective;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const PERSPECTIVES: PerspectiveConfig[] = [
  { 
    key: 'financeira', 
    label: 'Financeira', 
    icon: '💰',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  { 
    key: 'clientes', 
    label: 'Clientes', 
    icon: '👥',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  { 
    key: 'processos', 
    label: 'Processos Internos', 
    icon: '⚙️',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  { 
    key: 'aprendizado', 
    label: 'Aprendizado e Crescimento', 
    icon: '🌱',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  }
];

export const SEGMENTS = [
  { key: 'industria' as Segment, label: 'Indústria', icon: '🏭' },
  { key: 'servicos' as Segment, label: 'Serviços', icon: '💼' },
  { key: 'produto' as Segment, label: 'Produto / Varejo', icon: '🛍️' }
];
