// Pulse Module Types

export type PulseUserRole = 'admin_rh' | 'leader' | 'employee';
export type AnswerType = 'emoji_scale' | 'multi_select';
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type BadgeCategory = 'streak' | 'participation' | 'leadership' | 'culture' | 'improvement';
export type AlertType = 'score_drop' | 'low_participation' | 'low_score_persistent' | 'team_divergence' | 'improvement';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type ActionStatus = 'planned' | 'doing' | 'done' | 'wont_do_now';

export interface EmojiOption {
  value: number;
  emoji: string;
  label: string;
}

export interface PulseEmojiSet {
  id: string;
  account_id: string | null;
  name: string;
  type: 'likert5' | 'energy5' | 'clarity5' | 'pride5' | 'culture5';
  options: EmojiOption[];
  is_default: boolean;
  created_at: string;
}

export interface PulseDriver {
  id: string;
  account_id: string | null;
  key: string;
  name: string;
  description: string | null;
  default_emoji_set_id: string | null;
  is_anonymous: boolean;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

export interface PulsePillar {
  id: string;
  account_id: string | null;
  key: string;
  name: string;
  description: string | null;
  emoji: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

export interface PulseQuestion {
  id: string;
  account_id: string;
  driver_id: string | null;
  question_text: string;
  answer_type: AnswerType;
  emoji_set_id: string | null;
  multi_select_source: string | null;
  is_anonymous: boolean;
  max_repeat_per_month: number;
  is_active: boolean;
  ai_generated: boolean;
  tags: string[];
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  // Culture question fields (when merged from pulse_culture_questions)
  is_culture_question?: boolean;
  pillar_type?: string;
  reference_text?: string;
  // Joined data
  pulse_drivers?: PulseDriver;
  pulse_emoji_sets?: PulseEmojiSet;
}

export interface PulseDailyAssignment {
  id: string;
  account_id: string;
  date: string;
  generated_by: 'system' | 'admin' | 'ai';
  notes: string | null;
  created_at: string;
}

export interface PulseDailyAssignmentItem {
  id: string;
  assignment_id: string;
  order_index: number;
  question_id: string;
  created_at: string;
  // Joined data
  pulse_questions?: PulseQuestion;
}

export interface PulseResponse {
  id: string;
  account_id: string;
  assignment_id: string | null;
  question_id: string;
  date: string;
  respondent_user_id: string | null;
  respondent_team_id: string | null;
  respondent_leader_user_id: string | null;
  numeric_score: number | null;
  raw_emoji: string | null;
  multi_select_values: string[] | null;
  is_anonymous: boolean;
  created_at: string;
}

export interface PulseUserStreak {
  id: string;
  account_id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_response_date: string | null;
  total_responses: number;
  created_at: string;
  updated_at: string;
}

export interface PulseBadge {
  id: string;
  account_id: string | null;
  key: string;
  name: string;
  description: string | null;
  icon_emoji: string;
  tier: BadgeTier;
  category: BadgeCategory;
  criteria: Record<string, any>;
  points_reward: number;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface PulseUserBadge {
  id: string;
  account_id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: string;
  notified: boolean;
  // Joined data
  pulse_badges?: PulseBadge;
}

export interface PulseLevel {
  id: string;
  account_id: string | null;
  level_number: number;
  name: string;
  description: string | null;
  min_points: number;
  icon_emoji: string | null;
  perks: string[];
  is_default: boolean;
  created_at: string;
}

export interface PulseUserProgress {
  id: string;
  account_id: string;
  user_id: string;
  total_points: number;
  current_level: number;
  created_at: string;
  updated_at: string;
}

export interface PulseCompanyValue {
  id: string;
  account_id: string;
  key: string;
  name: string;
  emoji: string | null;
  description: string | null;
  dos: string[];
  donts: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

// UI State Types
export interface DailyPulseState {
  assignment: PulseDailyAssignment | null;
  questions: (PulseDailyAssignmentItem & { pulse_questions: PulseQuestion })[];
  currentIndex: number;
  responses: Map<string, PulseResponse>;
  isCompleted: boolean;
  isLoading: boolean;
}

export interface PulseAnswerPayload {
  question_id: string;
  numeric_score?: number;
  raw_emoji?: string;
  multi_select_values?: string[];
}

// Gamification
export interface StreakInfo {
  current: number;
  longest: number;
  lastDate: string | null;
  totalResponses: number;
}

export interface LevelInfo {
  current: number;
  name: string;
  emoji: string;
  points: number;
  nextLevelPoints: number;
  progress: number;
}
