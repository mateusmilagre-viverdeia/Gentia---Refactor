// Enums matching database
export type OnboardingResponsibleType = 'rh' | 'leader' | 'employee' | 'ti' | 'buddy';
export type OnboardingStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type OnboardingTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type OnboardingPhaseStatus = 'pending' | 'in_progress' | 'completed';
export type OnboardingRecommendation = 
  | 'efetivado' 
  | 'estender_onboarding' 
  | 'desligamento'
  | 'aprovado'
  | 'aprovado_ressalvas'
  | 'replanejar'
  | 'nao_aprovado';

// New enums for checkpoints and alerts
export type OnboardingCheckpointStatus = 'pending' | 'completed' | 'at_risk' | 'attention';
export type OnboardingRespondentType = 'employee' | 'leader';
export type OnboardingAlertType = 
  | 'task_delayed'
  | 'checkpoint_at_risk'
  | 'low_evaluation_score'
  | 'missing_leader_feedback'
  | 'onboarding_not_closed'
  | 'checkpoint_pending';
export type OnboardingAlertSeverity = 'low' | 'medium' | 'high' | 'critical';

// Template types
export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string | null;
  default_duration_days: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingTemplatePhase {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  order_index: number;
  duration_days: number;
  created_at: string;
}

export interface OnboardingTemplateTask {
  id: string;
  phase_id: string;
  title: string;
  description: string | null;
  responsible_type: OnboardingResponsibleType;
  is_required: boolean;
  order_index: number;
  created_at: string;
}

// Process types
export interface OnboardingProcess {
  id: string;
  employee_name: string;
  employee_email: string | null;
  employee_role: string | null;
  employee_department: string | null;
  leader_id: string | null;
  leader_name: string | null;
  hr_responsible_id: string | null;
  hr_responsible_name: string | null;
  template_id: string | null;
  status: OnboardingStatus;
  start_date: string;
  end_date: string;
  success_metrics: string[] | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingPhase {
  id: string;
  process_id: string;
  name: string;
  description: string | null;
  order_index: number;
  status: OnboardingPhaseStatus;
  start_date: string | null;
  end_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface OnboardingTask {
  id: string;
  phase_id: string;
  process_id: string;
  title: string;
  description: string | null;
  responsible_type: OnboardingResponsibleType;
  responsible_id: string | null;
  responsible_name: string | null;
  status: OnboardingTaskStatus;
  is_required: boolean;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  order_index: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingEvaluation {
  id: string;
  process_id: string;
  evaluator_id: string | null;
  evaluator_name: string | null;
  overall_rating: number | null;
  recommendation: OnboardingRecommendation;
  strengths: string | null;
  areas_for_improvement: string | null;
  additional_notes: string | null;
  metrics_achieved: Record<string, boolean> | null;
  // Expanded evaluation fields
  clarity_rating: number | null;
  culture_rating: number | null;
  autonomy_rating: number | null;
  delivery_rating: number | null;
  integration_rating: number | null;
  readiness_summary: string | null;
  evaluated_at: string;
  created_at: string;
}

// Checkpoint types
export interface OnboardingCheckpoint {
  id: string;
  process_id: string;
  checkpoint_day: number; // 7, 30, 60, 90
  name: string;
  description: string | null;
  scheduled_date: string;
  status: OnboardingCheckpointStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingCheckpointResponse {
  id: string;
  checkpoint_id: string;
  respondent_type: OnboardingRespondentType;
  respondent_id: string | null;
  respondent_name: string | null;
  // Employee scores
  feeling_score: number | null;
  role_clarity_score: number | null;
  team_integration_score: number | null;
  work_preparation_score: number | null;
  // Leader scores
  delivery_quality_score: number | null;
  culture_adherence_score: number | null;
  autonomy_score: number | null;
  // Common fields
  additional_notes: string | null;
  overall_score: number | null;
  responded_at: string;
  created_at: string;
}

// Alert types
export interface OnboardingAlert {
  id: string;
  process_id: string;
  alert_type: OnboardingAlertType;
  severity: OnboardingAlertSeverity;
  title: string;
  message: string | null;
  related_task_id: string | null;
  related_checkpoint_id: string | null;
  is_read: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

// Success metrics types
export interface OnboardingSuccessMetric {
  id: string;
  process_id: string;
  metric_name: string;
  metric_description: string | null;
  target_value: string | null;
  achieved_value: string | null;
  is_achieved: boolean | null;
  evaluated_at: string | null;
  created_at: string;
}

// Extended types with relations
export interface OnboardingTemplateWithPhases extends OnboardingTemplate {
  phases: OnboardingTemplatePhaseWithTasks[];
}

export interface OnboardingTemplatePhaseWithTasks extends OnboardingTemplatePhase {
  tasks: OnboardingTemplateTask[];
}

export interface OnboardingProcessWithDetails extends OnboardingProcess {
  phases: OnboardingPhaseWithTasks[];
  evaluation?: OnboardingEvaluation | null;
  checkpoints?: OnboardingCheckpointWithResponses[];
  alerts?: OnboardingAlert[];
  success_metrics_list?: OnboardingSuccessMetric[];
}

export interface OnboardingPhaseWithTasks extends OnboardingPhase {
  tasks: OnboardingTask[];
}

export interface OnboardingCheckpointWithResponses extends OnboardingCheckpoint {
  responses: OnboardingCheckpointResponse[];
}

// Input types for creating/updating
export interface CreateOnboardingProcessInput {
  employee_name: string;
  employee_email?: string;
  employee_role?: string;
  employee_department?: string;
  leader_id?: string;
  leader_name?: string;
  hr_responsible_id?: string;
  hr_responsible_name?: string;
  template_id?: string;
  start_date: string;
  end_date: string;
  success_metrics?: string[];
  notes?: string;
}

export interface CreateOnboardingTaskInput {
  phase_id: string;
  process_id: string;
  title: string;
  description?: string;
  responsible_type: OnboardingResponsibleType;
  responsible_id?: string;
  responsible_name?: string;
  is_required?: boolean;
  due_date?: string;
  order_index?: number;
}

export interface UpdateOnboardingTaskInput {
  title?: string;
  description?: string;
  responsible_type?: OnboardingResponsibleType;
  responsible_id?: string;
  responsible_name?: string;
  status?: OnboardingTaskStatus;
  due_date?: string;
  notes?: string;
}

export interface CreateOnboardingEvaluationInput {
  process_id: string;
  evaluator_id?: string;
  evaluator_name?: string;
  overall_rating: number;
  recommendation: OnboardingRecommendation;
  strengths?: string;
  areas_for_improvement?: string;
  additional_notes?: string;
  metrics_achieved?: Record<string, boolean>;
  // Expanded fields
  clarity_rating?: number;
  culture_rating?: number;
  autonomy_rating?: number;
  delivery_rating?: number;
  integration_rating?: number;
  readiness_summary?: string;
}

export interface CreateOnboardingCheckpointInput {
  process_id: string;
  checkpoint_day: number;
  name: string;
  description?: string;
  scheduled_date: string;
}

export interface CreateCheckpointResponseInput {
  checkpoint_id: string;
  respondent_type: OnboardingRespondentType;
  respondent_id?: string;
  respondent_name?: string;
  feeling_score?: number;
  role_clarity_score?: number;
  team_integration_score?: number;
  work_preparation_score?: number;
  delivery_quality_score?: number;
  culture_adherence_score?: number;
  autonomy_score?: number;
  additional_notes?: string;
}

export interface CreateOnboardingAlertInput {
  process_id: string;
  alert_type: OnboardingAlertType;
  severity?: OnboardingAlertSeverity;
  title: string;
  message?: string;
  related_task_id?: string;
  related_checkpoint_id?: string;
}

export interface CreateSuccessMetricInput {
  process_id: string;
  metric_name: string;
  metric_description?: string;
  target_value?: string;
}

// Helper functions
export const getResponsibleLabel = (type: OnboardingResponsibleType): string => {
  const labels: Record<OnboardingResponsibleType, string> = {
    rh: 'RH',
    leader: 'Líder',
    employee: 'Colaborador',
    ti: 'TI',
    buddy: 'Buddy',
  };
  return labels[type];
};

export const getStatusLabel = (status: OnboardingStatus): string => {
  const labels: Record<OnboardingStatus, string> = {
    draft: 'Rascunho',
    active: 'Em Andamento',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };
  return labels[status];
};

export const getTaskStatusLabel = (status: OnboardingTaskStatus): string => {
  const labels: Record<OnboardingTaskStatus, string> = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluído',
    skipped: 'Pulado',
  };
  return labels[status];
};

export const getPhaseStatusLabel = (status: OnboardingPhaseStatus): string => {
  const labels: Record<OnboardingPhaseStatus, string> = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluída',
  };
  return labels[status];
};

export const getRecommendationLabel = (rec: OnboardingRecommendation): string => {
  const labels: Record<OnboardingRecommendation, string> = {
    efetivado: 'Efetivado',
    estender_onboarding: 'Estender Onboarding',
    desligamento: 'Desligamento',
    aprovado: 'Aprovado',
    aprovado_ressalvas: 'Aprovado com Ressalvas',
    replanejar: 'Replanejar Onboarding',
    nao_aprovado: 'Não Aprovado',
  };
  return labels[rec];
};

export const getCheckpointStatusLabel = (status: OnboardingCheckpointStatus): string => {
  const labels: Record<OnboardingCheckpointStatus, string> = {
    pending: 'Pendente',
    completed: 'Concluído',
    at_risk: 'Em Risco',
    attention: 'Atenção',
  };
  return labels[status];
};

export const getAlertTypeLabel = (type: OnboardingAlertType): string => {
  const labels: Record<OnboardingAlertType, string> = {
    task_delayed: 'Tarefa Atrasada',
    checkpoint_at_risk: 'Checkpoint em Risco',
    low_evaluation_score: 'Avaliação Baixa',
    missing_leader_feedback: 'Feedback Pendente',
    onboarding_not_closed: 'Onboarding Não Encerrado',
    checkpoint_pending: 'Checkpoint Pendente',
  };
  return labels[type];
};

export const getAlertSeverityLabel = (severity: OnboardingAlertSeverity): string => {
  const labels: Record<OnboardingAlertSeverity, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica',
  };
  return labels[severity];
};

export const getResponsibleColor = (type: OnboardingResponsibleType): string => {
  const colors: Record<OnboardingResponsibleType, string> = {
    rh: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    leader: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    employee: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    ti: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    buddy: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  };
  return colors[type];
};

export const getStatusColor = (status: OnboardingStatus): string => {
  const colors: Record<OnboardingStatus, string> = {
    draft: 'bg-muted text-muted-foreground',
    active: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  return colors[status];
};

export const getTaskStatusColor = (status: OnboardingTaskStatus): string => {
  const colors: Record<OnboardingTaskStatus, string> = {
    pending: 'bg-muted text-muted-foreground',
    in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    skipped: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  };
  return colors[status];
};

export const getCheckpointStatusColor = (status: OnboardingCheckpointStatus): string => {
  const colors: Record<OnboardingCheckpointStatus, string> = {
    pending: 'bg-muted text-muted-foreground',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    at_risk: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    attention: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  };
  return colors[status];
};

export const getAlertSeverityColor = (severity: OnboardingAlertSeverity): string => {
  const colors: Record<OnboardingAlertSeverity, string> = {
    low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  return colors[severity];
};

export const getCheckpointStatusIcon = (status: OnboardingCheckpointStatus): string => {
  const icons: Record<OnboardingCheckpointStatus, string> = {
    pending: '⏳',
    completed: '🟢',
    at_risk: '🔴',
    attention: '🟡',
  };
  return icons[status];
};

// Default checkpoint days
export const DEFAULT_CHECKPOINT_DAYS = [7, 30, 60, 90] as const;

// Default checkpoint names
export const getDefaultCheckpointName = (day: number): string => {
  const names: Record<number, string> = {
    7: 'Integração Inicial',
    30: 'Clareza e Primeiras Entregas',
    60: 'Autonomia em Construção',
    90: 'Prontidão Final',
  };
  return names[day] || `Checkpoint Dia ${day}`;
};
