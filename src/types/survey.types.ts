import type { Json } from '@/integrations/supabase/types';

export type SurveyCategory = 'satisfaction' | 'engagement' | 'values' | 'performance' | 'pulse' | 'custom';
export type QuestionType = 'single_choice' | 'multiple_choice' | 'text' | 'scale' | 'nps';
export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived';
export type InvitationStatus = 'pending' | 'viewed' | 'completed';
export type RecurrencePattern = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannual' | 'annually' | 'custom';

export interface CustomRecurrenceDate {
  start: string;
  end: string;
}
export type ScheduleStatus = 'pending' | 'executed' | 'cancelled';

// Use Json from Supabase for flexibility
export type QuestionOptions = Json;

export interface SurveyTemplate {
  id: string;
  account_id: string | null;
  name: string;
  description: string | null;
  category: SurveyCategory | null;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  questions?: SurveyTemplateQuestion[];
}

export interface SurveyTemplateQuestion {
  id: string;
  template_id: string;
  question_text: string;
  question_type: QuestionType;
  options: QuestionOptions | null;
  required: boolean;
  position: number;
  created_at: string;
}

export interface Survey {
  id: string;
  account_id: string;
  template_id: string | null;
  title: string;
  description: string | null;
  category: SurveyCategory | null;
  is_anonymous: boolean;
  start_date: string;
  end_date: string;
  status: SurveyStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Recurrence fields
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  recurrence_end_date?: string | null;
  parent_survey_id?: string | null;
  recurrence_count?: number;
  // Reminder fields
  reminder_enabled?: boolean;
  reminder_days_before?: number[];
  reminder_sent_dates?: string[];
  custom_recurrence_dates?: Json | null;
  questions?: SurveyQuestion[];
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: QuestionType;
  options: QuestionOptions | null;
  required: boolean;
  position: number;
  created_at: string;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  respondent_id: string | null;
  is_anonymous: boolean;
  submitted_at: string | null;
  created_at: string;
}

export interface SurveyAnswer {
  id: string;
  response_id: string;
  question_id: string;
  answer_text: string | null;
  answer_options: Json | null;
  answer_scale: number | null;
  created_at: string;
}

export interface SurveyInvitation {
  id: string;
  survey_id: string;
  user_id: string;
  sent_at: string;
  viewed_at: string | null;
  responded_at: string | null;
  reminder_count: number;
  status: InvitationStatus;
  user_name?: string;
  user_email?: string;
}

export interface SurveySchedule {
  id: string;
  survey_id: string;
  scheduled_start_date: string;
  scheduled_end_date: string;
  status: ScheduleStatus;
  created_survey_id?: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  account_id: string | null;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface SurveyStats {
  totalInvited: number;
  totalResponded: number;
  responseRate: number;
  pending: number;
  viewed: number;
}

export interface QuestionStats {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  responses: number;
  distribution?: Record<string, number>;
  average?: number;
  nps?: {
    promoters: number;
    passives: number;
    detractors: number;
    score: number;
  };
  textResponses?: string[];
}

export const CATEGORY_LABELS: Record<SurveyCategory, string> = {
  satisfaction: 'Satisfação',
  engagement: 'Clima Organizacional',
  values: 'Aderência aos Valores',
  performance: 'Avaliação de Desempenho',
  pulse: 'Pesquisa de Pulso',
  custom: 'Personalizado',
};

export const CATEGORY_ICONS: Record<SurveyCategory, string> = {
  satisfaction: '😊',
  engagement: '🏢',
  values: '💎',
  performance: '📊',
  pulse: '💓',
  custom: '✏️',
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Escolha Única',
  multiple_choice: 'Múltipla Escolha',
  text: 'Texto Livre',
  scale: 'Escala',
  nps: 'NPS (0-10)',
};

export const STATUS_LABELS: Record<SurveyStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  closed: 'Encerrado',
  archived: 'Arquivado',
};

export const RECURRENCE_LABELS: Record<RecurrencePattern, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  biannual: 'Semestral',
  annually: 'Anual',
  custom: 'Personalizado',
};

export const REMINDER_OPTIONS = [
  { value: 0, label: 'No dia do início' },
  { value: 1, label: '1 dia antes' },
  { value: 3, label: '3 dias antes' },
  { value: 7, label: '7 dias antes' },
  { value: 14, label: '14 dias antes' },
];
