// Sistema de Evolução - Tipos TypeScript

export type EvolutionCycleStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type EvolutionObjectiveStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';
export type EvolutionActionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type EvolutionActionType = 'practical' | 'support' | 'learning';
export type EvolutionCompetencyType = 'technical' | 'behavioral' | 'technical_required' | 'technical_desired';
export type EvolutionCompetencySource = 'job_description' | 'performance_assessment' | 'cultural_assessment' | 'strategic_project' | 'manual' | 'qa_assessment';
export type EvolutionFeedbackType = 'leader' | 'peer' | 'self' | 'ai_suggestion';
export type EvolutionCheckinType = 'regular' | 'milestone' | 'final';

export interface EvolutionCycle {
  id: string;
  account_id: string;
  collaborator_id: string;
  leader_id?: string;
  job_description_id?: string;
  status: EvolutionCycleStatus;
  start_date: string;
  end_date: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  competencies?: EvolutionCompetency[];
  objectives?: EvolutionObjective[];
  checkins?: EvolutionCheckin[];
  feedbacks?: EvolutionFeedback[];
  job_description?: {
    id: string;
    title: string;
  };
  collaborator?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  leader?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface EvolutionCompetency {
  id: string;
  cycle_id: string;
  competency_name: string;
  competency_type: EvolutionCompetencyType;
  strategic_justification: string;
  expected_impact: string;
  source?: EvolutionCompetencySource;
  source_reference_id?: string;
  is_priority: boolean;
  has_competency: boolean;
  development_deadline?: string;
  success_indicators?: string[];
  created_at: string;
}

export interface EvolutionObjective {
  id: string;
  cycle_id: string;
  competency_id?: string;
  objective_text: string;
  key_behaviors: string[];
  progress_indicators: string[];
  status: EvolutionObjectiveStatus;
  order_index: number;
  created_at: string;
  updated_at: string;
  // Relations
  actions?: EvolutionAction[];
  competency?: EvolutionCompetency;
}

export interface EvolutionAction {
  id: string;
  objective_id: string;
  action_type: EvolutionActionType;
  description: string;
  linked_project_id?: string;
  linked_project_name?: string;
  responsible?: string;
  due_date?: string;
  status: EvolutionActionStatus;
  evidence_description?: string;
  evidence_url?: string;
  completed_at?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface EvolutionCheckin {
  id: string;
  cycle_id: string;
  checkin_date: string;
  checkin_type: EvolutionCheckinType;
  planned_vs_executed?: string;
  perceived_evolution?: string;
  real_evidence?: string;
  blockers?: string;
  next_steps?: string;
  overall_progress?: number;
  ai_generated_questions?: string[];
  created_by?: string;
  created_at: string;
}

export interface EvolutionFeedback {
  id: string;
  cycle_id: string;
  feedback_type: EvolutionFeedbackType;
  content: string;
  translated_focus?: string;
  created_by?: string;
  created_at: string;
}

// Competency assessment for gap analysis
export interface CompetencyAssessment {
  competency_name: string;
  competency_type: EvolutionCompetencyType;
  has_competency: boolean;
  development_deadline?: string;
  success_indicators: string[];
  actions: {
    action_type: EvolutionActionType;
    description: string;
    responsible?: string;
    due_date?: string;
  }[];
}

// Form types for wizard
export interface EvolutionWizardData {
  // Step 1: Basic info
  collaborator_id: string;
  leader_id?: string;
  job_description_id: string; // Now required
  start_date: string;
  end_date: string;
  notes?: string;
  // Step 2: Competency Assessment (from Job Description)
  competencyAssessments: CompetencyAssessment[];
}

// Analytics types
export interface EvolutionAnalytics {
  total_cycles: number;
  active_cycles: number;
  completed_cycles: number;
  cancelled_cycles: number;
  completion_rate: number;
  avg_actions_per_cycle: number;
  avg_objectives_per_cycle: number;
  most_common_competencies: { name: string; count: number }[];
  actions_by_type: { type: EvolutionActionType; count: number }[];
}
