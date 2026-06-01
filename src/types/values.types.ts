export interface ValuesCatalogItem {
  id: string;
  label: string;
  active: boolean;
  created_at: string;
}

export interface ValuesSession {
  id: string;
  user_id: string;
  stage: number;
  created_at: string;
  updated_at: string;
}

export interface ValuesSelection {
  id: string;
  session_id: string;
  value_id: string;
  phase: number;
  position?: number;
  created_at: string;
}

export interface ValuesCompanyInfo {
  id: string;
  session_id: string;
  company_name: string;
  user_name: string;
  created_at: string;
}

export interface ValuesOpenAnswers {
  id: string;
  session_id: string;
  intolerable?: string;
  expectations?: string;
  created_at: string;
}

export interface ValuesRating {
  id: string;
  session_id: string;
  value_id: string;
  score: number;
  valid: boolean;
  created_at: string;
}

export interface ValuesFinalCheck {
  id: string;
  session_id: string;
  percent_resolved: number;
  passed: boolean;
  created_at: string;
}

export interface ValuesBehaviorsOptions {
  id: string;
  session_id: string;
  value_label: string;
  dos: string[];
  donts: string[];
  created_at: string;
}

export interface ValuesBehaviorsSelections {
  id: string;
  session_id: string;
  value_label: string;
  do_selected: string[];
  dont_selected: string[];
  created_at: string;
}

export interface SelectedValue {
  id: string;
  label: string;
}
