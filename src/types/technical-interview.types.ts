export interface TechnicalQuestion {
  skill: string;
  skillType: "required" | "desired";
  level: number;
  questionText: string;
  followupSuperficial?: string;
  followupExcellent?: string;
  isFromBank: boolean;
}

export interface SkillEvaluation {
  skill: string;
  skillType: "required" | "desired";
  score: number;
  level: "basic" | "intermediate" | "advanced" | "expert";
  justification: string;
  evidence: string[];
}

export interface TechnicalInterviewSession {
  id: string;
  account_id: string;
  job_id: string;
  candidate_id: string | null;
  candidate_profile_id: string | null;
  agent_id: string | null;
  token: string | null;
  expires_at: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled" | "expired";
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  questions: TechnicalQuestion[];
  transcript: string | null;
  ai_messages: any[];
  audio_url: string | null;
  audio_storage_path: string | null;
  skill_scores: Record<string, number>;
  skill_levels: Record<string, string>;
  overall_score: number | null;
  evaluation_summary: string | null;
  strengths: string[];
  gaps: string[];
  recommendation: "recommended" | "conditional" | "not_recommended" | null;
  job_description_context: {
    title: string;
    mission: string;
    requiredSkills: string[];
    desiredSkills: string[];
    responsibilities: string[];
  } | null;
  created_at: string;
  updated_at: string;
}

export interface TechnicalInterviewResponse {
  id: string;
  session_id: string;
  skill_name: string;
  skill_type: "required" | "desired" | null;
  question_index: number | null;
  question_text: string;
  question_level: number;
  is_followup: boolean;
  parent_response_id: string | null;
  candidate_response: string | null;
  response_quality: "excellent" | "correct" | "partial" | "incorrect" | "superficial" | null;
  score: number | null;
  ai_analysis: string | null;
  created_at: string;
}

export interface TechnicalQuestionBankItem {
  id: string;
  account_id: string;
  agent_id: string | null;
  skill_name: string;
  skill_category: string | null;
  question_text: string;
  level: number;
  question_type: "conceptual" | "practical" | "scenario" | "debugging";
  followup_if_superficial: string | null;
  followup_if_incorrect: string | null;
  followup_if_excellent: string | null;
  expected_keywords: string[];
  excellent_answer_example: string | null;
  is_mandatory: boolean;
  is_active: boolean;
  usage_count: number;
  avg_score: number | null;
  created_at: string;
  updated_at: string;
}

export type TechnicalInterviewStepType = "technical";
