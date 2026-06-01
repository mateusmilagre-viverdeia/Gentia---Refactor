export type ActionPlanStatus = 'planejada' | 'em_andamento' | 'concluida' | 'cancelada';
export type ActionPlanPriority = 'baixa' | 'media' | 'alta' | 'urgente';

export interface ActionPlan {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  responsible: string;
  status: ActionPlanStatus;
  deadline: string | null;
  priority: ActionPlanPriority;
  created_at: string;
  updated_at: string;
}

export interface ActionPlanFormData {
  title: string;
  description?: string;
  responsible: string;
  status: ActionPlanStatus;
  deadline?: Date;
  priority: ActionPlanPriority;
}

export const STATUS_OPTIONS: { value: ActionPlanStatus; label: string }[] = [
  { value: 'planejada', label: 'Planejada' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
];

export const PRIORITY_OPTIONS: { value: ActionPlanPriority; label: string }[] = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];
