// Enums matching database
export type OffboardingTerminationType = 'voluntary' | 'involuntary' | 'contract_end';
export type OffboardingStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type OffboardingTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'waived';
export type OffboardingSurveyStatus = 'pending' | 'sent' | 'responded';
export type OffboardingResponsibleType = 'rh' | 'leader' | 'employee' | 'ti' | 'head_cs';
export type OffboardingTaskType = 'survey' | 'access_revocation' | 'equipment' | 'documentation' | 'communication' | 'other';

// Exit reasons for survey
export const EXIT_REASONS = [
  { value: 'better_opportunity', label: 'Melhor oportunidade de carreira' },
  { value: 'salary', label: 'Remuneração e benefícios' },
  { value: 'work_life_balance', label: 'Equilíbrio trabalho-vida pessoal' },
  { value: 'leadership', label: 'Relacionamento com liderança' },
  { value: 'culture', label: 'Cultura organizacional' },
  { value: 'growth', label: 'Falta de oportunidades de crescimento' },
  { value: 'workload', label: 'Carga de trabalho excessiva' },
  { value: 'relocation', label: 'Mudança de cidade/país' },
  { value: 'health', label: 'Questões de saúde' },
  { value: 'personal', label: 'Motivos pessoais/familiares' },
  { value: 'studies', label: 'Retorno aos estudos' },
  { value: 'entrepreneurship', label: 'Empreendedorismo próprio' },
  { value: 'other', label: 'Outro motivo' },
] as const;

// Main case type
export interface OffboardingCase {
  id: string;
  account_id: string;
  employee_user_id: string | null;
  employee_name: string;
  employee_email: string | null;
  department: string | null;
  position: string | null;
  manager_id: string | null;
  manager_name: string | null;
  termination_type: OffboardingTerminationType;
  notice_date: string;
  last_day: string;
  status: OffboardingStatus;
  survey_status: OffboardingSurveyStatus;
  survey_sent_at: string | null;
  survey_responded_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Template types
export interface OffboardingTemplate {
  id: string;
  account_id: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OffboardingTemplateTask {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  responsible_type: OffboardingResponsibleType;
  responsible_profile: string | null;
  due_offset_days: number;
  is_required: boolean;
  order_index: number;
  task_type: OffboardingTaskType | null;
  created_at: string;
}

// Task instance type
export interface OffboardingTask {
  id: string;
  case_id: string;
  title: string;
  description: string | null;
  responsible_type: OffboardingResponsibleType;
  responsible_profile: string | null;
  responsible_user_id: string | null;
  responsible_user_name: string | null;
  due_date: string | null;
  status: OffboardingTaskStatus;
  completed_at: string | null;
  completed_by: string | null;
  is_required: boolean;
  waive_reason: string | null;
  order_index: number;
  task_type: OffboardingTaskType | null;
  created_at: string;
  updated_at: string;
}

// Survey token type
export interface OffboardingSurveyToken {
  id: string;
  case_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

// Survey response type
export interface OffboardingSurveyResponse {
  id: string;
  case_id: string;
  primary_reason: string | null;
  secondary_reasons: string[] | null;
  avoidability_score: number | null;
  enps_score: number | null;
  leadership_rating: number | null;
  growth_rating: number | null;
  workload_rating: number | null;
  compensation_rating: number | null;
  additional_comments: string | null;
  responded_at: string;
  created_at: string;
}

// Extended types with relations
export interface OffboardingCaseWithTasks extends OffboardingCase {
  offboarding_tasks: OffboardingTask[];
}

export interface OffboardingCaseWithDetails extends OffboardingCase {
  tasks: OffboardingTask[];
  survey_response?: OffboardingSurveyResponse | null;
  survey_token?: OffboardingSurveyToken | null;
}

export interface OffboardingTemplateWithTasks extends OffboardingTemplate {
  tasks: OffboardingTemplateTask[];
}

// Input types for creating/updating
export interface CreateOffboardingCaseInput {
  account_id: string;
  employee_user_id?: string;
  employee_name: string;
  employee_email?: string;
  department?: string;
  position?: string;
  manager_id?: string;
  manager_name?: string;
  termination_type: OffboardingTerminationType;
  notice_date: string;
  last_day: string;
  notes?: string;
}

export interface UpdateOffboardingCaseInput {
  employee_name?: string;
  employee_email?: string;
  department?: string;
  position?: string;
  manager_id?: string;
  manager_name?: string;
  termination_type?: OffboardingTerminationType;
  notice_date?: string;
  last_day?: string;
  status?: OffboardingStatus;
  notes?: string;
}

export interface CreateOffboardingTaskInput {
  case_id: string;
  title: string;
  description?: string;
  responsible_type: OffboardingResponsibleType;
  responsible_profile?: string;
  responsible_user_id?: string;
  responsible_user_name?: string;
  due_date?: string;
  is_required?: boolean;
  order_index?: number;
  task_type?: OffboardingTaskType;
}

export interface UpdateOffboardingTaskInput {
  title?: string;
  description?: string;
  responsible_type?: OffboardingResponsibleType;
  responsible_profile?: string;
  responsible_user_id?: string;
  responsible_user_name?: string;
  due_date?: string;
  status?: OffboardingTaskStatus;
  waive_reason?: string;
}

export interface SubmitExitSurveyInput {
  case_id: string;
  primary_reason: string;
  secondary_reasons?: string[];
  avoidability_score: number;
  enps_score: number;
  leadership_rating: number;
  growth_rating: number;
  workload_rating: number;
  compensation_rating: number;
  additional_comments?: string;
}

// Helper functions
export const getTerminationTypeLabel = (type: OffboardingTerminationType): string => {
  const labels: Record<OffboardingTerminationType, string> = {
    voluntary: 'Voluntário',
    involuntary: 'Involuntário',
    contract_end: 'Término de Contrato',
  };
  return labels[type];
};

export const getOffboardingStatusLabel = (status: OffboardingStatus): string => {
  const labels: Record<OffboardingStatus, string> = {
    draft: 'Rascunho',
    active: 'Em Andamento',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };
  return labels[status];
};

export const getOffboardingTaskStatusLabel = (status: OffboardingTaskStatus): string => {
  const labels: Record<OffboardingTaskStatus, string> = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluído',
    skipped: 'Pulado',
    waived: 'Dispensado',
  };
  return labels[status];
};

export const getSurveyStatusLabel = (status: OffboardingSurveyStatus): string => {
  const labels: Record<OffboardingSurveyStatus, string> = {
    pending: 'Pendente',
    sent: 'Enviada',
    responded: 'Respondida',
  };
  return labels[status];
};

export const getResponsibleTypeLabel = (type: OffboardingResponsibleType): string => {
  const labels: Record<OffboardingResponsibleType, string> = {
    rh: 'RH',
    leader: 'Líder',
    employee: 'Colaborador',
    ti: 'TI',
    head_cs: 'Head de CS',
  };
  return labels[type];
};

export const getTaskTypeLabel = (type: OffboardingTaskType | null): string => {
  if (!type) return 'Outra';
  const labels: Record<OffboardingTaskType, string> = {
    survey: 'Pesquisa',
    access_revocation: 'Revogação de Acessos',
    equipment: 'Equipamentos',
    documentation: 'Documentação',
    communication: 'Comunicação',
    other: 'Outra',
  };
  return labels[type];
};

export const getOffboardingStatusColor = (status: OffboardingStatus): string => {
  const colors: Record<OffboardingStatus, string> = {
    draft: 'bg-muted text-muted-foreground',
    active: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  return colors[status];
};

export const getTaskStatusColor = (status: OffboardingTaskStatus): string => {
  const colors: Record<OffboardingTaskStatus, string> = {
    pending: 'bg-muted text-muted-foreground',
    in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    skipped: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    waived: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  };
  return colors[status];
};

export const getSurveyStatusColor = (status: OffboardingSurveyStatus): string => {
  const colors: Record<OffboardingSurveyStatus, string> = {
    pending: 'bg-muted text-muted-foreground',
    sent: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    responded: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };
  return colors[status];
};

export const getResponsibleTypeColor = (type: OffboardingResponsibleType): string => {
  const colors: Record<OffboardingResponsibleType, string> = {
    rh: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    leader: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    employee: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    ti: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    head_cs: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  };
  return colors[type];
};

export const getTerminationTypeColor = (type: OffboardingTerminationType): string => {
  const colors: Record<OffboardingTerminationType, string> = {
    voluntary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    involuntary: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    contract_end: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };
  return colors[type];
};

// Calculate checklist completion percentage
export const calculateChecklistProgress = (tasks: OffboardingTask[]): number => {
  if (tasks.length === 0) return 0;
  const completedCount = tasks.filter(t => t.status === 'completed' || t.status === 'waived' || t.status === 'skipped').length;
  return Math.round((completedCount / tasks.length) * 100);
};

// Get overdue tasks count
export const getOverdueTasksCount = (tasks: OffboardingTask[]): number => {
  const today = new Date().toISOString().split('T')[0];
  return tasks.filter(t => 
    t.status === 'pending' && 
    t.due_date && 
    t.due_date < today
  ).length;
};
