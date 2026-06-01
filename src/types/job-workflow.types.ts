export type RecruitmentWorkflowStepType = "screening" | "cultural" | "disc" | "technical";

export interface ScreeningQuestion {
  id: string;
  category: "modality" | "skill" | "selling" | "custom";
  text: string;
  required: boolean;
}

export type RecruitmentWorkflowThresholdConfig = {
  // Generic score threshold (0-100)
  min_score?: number;
  // DISC match threshold (0-100)
  min_match?: number;
  // Screening questions
  questions?: ScreeningQuestion[];
};

export interface RecruitmentJobWorkflowStep {
  id: string;
  account_id: string;
  job_id: string;
  step_type: RecruitmentWorkflowStepType;
  agent_id: string | null;
  position: number;
  threshold_config: RecruitmentWorkflowThresholdConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type RecruitmentJobWorkflowStepInput = {
  id?: string;
  step_type: RecruitmentWorkflowStepType;
  agent_id: string | null;
  threshold_config: RecruitmentWorkflowThresholdConfig;
};
