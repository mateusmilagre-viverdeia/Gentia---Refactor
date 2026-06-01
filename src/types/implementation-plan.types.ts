export type PlanMode = 'creation' | 'revision';
export type PlanStatus = 'draft' | 'active' | 'completed';

export interface SolutionItem {
  id: string;
  name: string;
  pillar: 'cultura' | 'atracao' | 'retencao' | 'resultado' | 'adicional';
  baseDurationMonths: number | null;
  durationType: 'months' | 'per_leader' | 'per_event' | 'unique';
  durationLabel: string;
  mode?: PlanMode;
}

export interface PillarGroup {
  pillar: SolutionItem['pillar'];
  label: string;
  color: string;
  badgeClass: string;
  solutions: SolutionItem[];
}

export interface PlanStep {
  id: string;
  solutionId: string;
  name: string;
  pillar: string;
  order: number;
  durationMin: string;
  durationMed: string;
  durationMax: string;
  metrics: string[];
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  checkpoints: string[];
  startDate?: string;
  dueDate?: string;
}

export interface AIPlan {
  summary: string;
  priorityReason: string;
  steps: PlanStep[];
  totalDurationMin: string;
  totalDurationMed: string;
  totalDurationMax: string;
  metrics: Array<{
    name: string;
    current: string;
    target: string;
    impact: string;
  }>;
}

export interface ImplementationPlan {
  id: string;
  account_id: string;
  mode: PlanMode;
  selected_solutions: SolutionItem[];
  assessment_data: Record<string, unknown> | null;
  calculator_data: Record<string, unknown> | null;
  ai_plan: AIPlan | null;
  steps: PlanStep[];
  status: PlanStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  additional_info?: string;
  activated_at?: string;
  project_duration?: number;
}

export const SOLUTIONS_CATALOG: PillarGroup[] = [
  {
    pillar: 'cultura',
    label: 'Cultura',
    color: '#8B5CF6',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
    solutions: [
      {
        id: 'cultura_clara',
        name: 'Criar uma Cultura Clara e Forte',
        pillar: 'cultura',
        baseDurationMonths: 4,
        durationType: 'months',
        durationLabel: '4 meses',
      },
    ],
  },
  {
    pillar: 'atracao',
    label: 'Atração',
    color: '#10B981',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
    solutions: [
      {
        id: 'atrair_contratar',
        name: 'Atrair e Contratar as pessoas certas, alinhadas à cultura',
        pillar: 'atracao',
        baseDurationMonths: 3,
        durationType: 'months',
        durationLabel: '3 meses',
      },
    ],
  },
  {
    pillar: 'retencao',
    label: 'Retenção',
    color: '#F59E0B',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    solutions: [
      {
        id: 'gente_certa',
        name: 'Retenção e Engajamento: Gente Certa no Lugar Certo',
        pillar: 'retencao',
        baseDurationMonths: 3,
        durationType: 'months',
        durationLabel: '3 meses',
      },
      {
        id: 'dev_lideres',
        name: 'Desenvolvimento de Líderes',
        pillar: 'retencao',
        baseDurationMonths: null,
        durationType: 'per_leader',
        durationLabel: 'Por líder',
      },
    ],
  },
  {
    pillar: 'resultado',
    label: 'Resultado',
    color: '#3B82F6',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    solutions: [
      {
        id: 'processos',
        name: 'Processos',
        pillar: 'resultado',
        baseDurationMonths: 4,
        durationType: 'months',
        durationLabel: '4 meses',
      },
      {
        id: 'planejamento_estrategico',
        name: 'Planejamento Estratégico',
        pillar: 'resultado',
        baseDurationMonths: 4,
        durationType: 'months',
        durationLabel: '4 meses',
      },
      {
        id: 'desdobramento_estrategia',
        name: 'Desdobramento da Estratégia em Modelo de Gestão',
        pillar: 'resultado',
        baseDurationMonths: 3,
        durationType: 'months',
        durationLabel: '3 meses',
      },
    ],
  },
];
