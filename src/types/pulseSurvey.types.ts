// Pulse Survey Types

export type PulseSurveyStatus = 'draft' | 'active' | 'paused' | 'closed';
export type PulseSurveyFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface PulseSurvey {
  id: string;
  account_id: string;
  title: string;
  description: string | null;
  status: PulseSurveyStatus;
  
  // Step 1: Drivers
  selected_driver_keys: string[];
  
  // Step 2: Teams
  selected_team_ids: string[];
  all_teams: boolean;
  
  // Step 3: Frequency
  frequency: PulseSurveyFrequency;
  send_time: string;
  send_days: number[];
  start_date: string | null;
  end_date: string | null;
  
  // Step 4: Rules
  questions_per_day: number;
  block_repeat_days: number;
  
  // Step 5: Questions
  selected_question_ids: string[];
  
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreatePulseSurveyData {
  title: string;
  description?: string;
  selected_driver_keys: string[];
  selected_team_ids?: string[];
  all_teams?: boolean;
  frequency: PulseSurveyFrequency;
  send_time?: string;
  send_days?: number[];
  start_date?: string;
  end_date?: string;
  questions_per_day?: number;
  block_repeat_days?: number;
  selected_question_ids: string[];
}

export interface UpdatePulseSurveyData extends Partial<CreatePulseSurveyData> {
  status?: PulseSurveyStatus;
}

export const FREQUENCY_LABELS: Record<PulseSurveyFrequency, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
};

export const STATUS_LABELS: Record<PulseSurveyStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  paused: 'Pausado',
  closed: 'Encerrado',
};

export const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};
