// ===========================================
// TIPOS PARA SISTEMA DE CARGOS E SALÁRIOS (V.A.L.O.R)
// ===========================================

export type StrategyType = 'growth' | 'efficiency' | 'turnaround';
export type CareerTrack = 'technical' | 'leadership' | 'specialist';
export type OutcomeType = 'delivery' | 'indicator' | 'behavior';
export type ConnectedTo = 'performance' | 'evolution' | 'merit';
export type CriterionType = 'performance' | 'evolution' | 'time' | 'market' | 'custom';
export type ProgressionStatus = 'entry' | 'developing' | 'ready' | 'exceeding';
export type ChangeType = 'merit' | 'promotion' | 'adjustment' | 'market';
export type Periodicity = 'monthly' | 'yearly';

// Modelos de Compensação
export interface CompensationModel {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  strategy_type: StrategyType;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCompensationModelInput {
  name: string;
  description?: string;
  strategy_type?: StrategyType;
  settings?: Record<string, unknown>;
}

// Famílias de Cargos
export interface JobFamily {
  id: string;
  model_id: string;
  name: string;
  description: string | null;
  career_track: CareerTrack;
  display_order: number;
  created_at: string;
}

export interface CreateJobFamilyInput {
  model_id: string;
  name: string;
  description?: string;
  career_track?: CareerTrack;
  display_order?: number;
}

// Cargos (Positions)
export interface Position {
  id: string;
  family_id: string;
  job_description_id: string | null;
  org_node_id: string | null;
  name: string;
  code: string | null;
  // V - VALOR
  mission: string | null;
  strategic_value: string | null;
  business_problem: string | null;
  strategic_delivery: string | null;
  // A - ARQUITETURA
  area: string | null;
  sub_area: string | null;
  reports_to: string | null;
  critical_interfaces: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePositionInput {
  family_id: string;
  name: string;
  code?: string;
  mission?: string;
  strategic_value?: string;
  business_problem?: string;
  strategic_delivery?: string;
  area?: string;
  sub_area?: string;
  reports_to?: string;
  critical_interfaces?: string[];
  job_description_id?: string;
  org_node_id?: string;
}

// Níveis de Complexidade
export interface PositionLevel {
  id: string;
  position_id: string;
  code: string;
  name: string;
  description: string | null;
  level_order: number;
  autonomy_level: string | null;
  complexity_level: string | null;
  impact_level: string | null;
  decision_scope: string | null;
  influence_degree: string | null;
  custom_criteria: Record<string, unknown>;
  created_at: string;
}

export interface CreatePositionLevelInput {
  position_id: string;
  code: string;
  name: string;
  description?: string;
  level_order: number;
  autonomy_level?: string;
  complexity_level?: string;
  impact_level?: string;
  decision_scope?: string;
  influence_degree?: string;
  custom_criteria?: Record<string, unknown>;
}

// Faixas Salariais
export interface SalaryRange {
  id: string;
  level_id: string;
  minimum: number;
  midpoint: number;
  maximum: number;
  currency: string;
  periodicity: Periodicity;
  effective_date: string;
  market_reference: Record<string, unknown> | null;
  created_at: string;
}

export interface CreateSalaryRangeInput {
  level_id: string;
  minimum: number;
  midpoint: number;
  maximum: number;
  currency?: string;
  periodicity?: Periodicity;
  effective_date?: string;
  market_reference?: Record<string, unknown>;
}

// Entregas Esperadas
export interface LevelOutcome {
  id: string;
  level_id: string;
  outcome_type: OutcomeType;
  description: string;
  measurement: string | null;
  connected_to: ConnectedTo | null;
  created_at: string;
}

export interface CreateLevelOutcomeInput {
  level_id: string;
  outcome_type: OutcomeType;
  description: string;
  measurement?: string;
  connected_to?: ConnectedTo;
}

// Critérios de Progressão
export interface ProgressionCriterion {
  id: string;
  from_level_id: string;
  to_level_id: string;
  criterion_type: CriterionType;
  description: string;
  weight: number;
  minimum_value: string | null;
  created_at: string;
}

export interface CreateProgressionCriterionInput {
  from_level_id: string;
  to_level_id: string;
  criterion_type: CriterionType;
  description: string;
  weight?: number;
  minimum_value?: string;
}

// Posicionamento de Colaboradores
export interface EmployeePosition {
  id: string;
  profile_id: string;
  level_id: string;
  current_salary: number | null;
  effective_date: string;
  range_position: number | null;
  progression_status: ProgressionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeePositionInput {
  profile_id: string;
  level_id: string;
  current_salary?: number;
  effective_date?: string;
  range_position?: number;
  progression_status?: ProgressionStatus;
  notes?: string;
}

// Histórico Salarial
export interface SalaryHistory {
  id: string;
  employee_position_id: string;
  previous_salary: number | null;
  new_salary: number | null;
  change_type: ChangeType;
  reason: string | null;
  effective_date: string;
  approved_by: string | null;
  created_at: string;
}

export interface CreateSalaryHistoryInput {
  employee_position_id: string;
  previous_salary?: number;
  new_salary?: number;
  change_type: ChangeType;
  reason?: string;
  effective_date: string;
  approved_by?: string;
}

// ===========================================
// TIPOS COMPOSTOS
// ===========================================

export interface PositionWithLevels extends Position {
  levels: PositionLevel[];
  family?: JobFamily;
}

export interface PositionLevelWithRange extends PositionLevel {
  salary_range: SalaryRange | null;
  outcomes: LevelOutcome[];
}

export interface JobFamilyWithPositions extends JobFamily {
  positions: PositionWithLevels[];
}

export interface CompensationModelWithFamilies extends CompensationModel {
  families: JobFamilyWithPositions[];
}

// ===========================================
// TEMPLATES
// ===========================================

export interface CompensationTemplate {
  id: string;
  name: string;
  description: string;
  company_size: 'startup' | 'scaleup' | 'enterprise';
  families: {
    name: string;
    career_track: CareerTrack;
  }[];
  default_levels: {
    code: string;
    name: string;
    description: string;
  }[];
  tracks: CareerTrack[];
}

// ===========================================
// WIZARD V.A.L.O.R
// ===========================================

export type ValorWizardStep = 'value' | 'architecture' | 'levels' | 'outcomes' | 'remuneration';

export interface ValorWizardState {
  currentStep: ValorWizardStep;
  position: Partial<CreatePositionInput>;
  levels: Partial<CreatePositionLevelInput>[];
  outcomes: Record<string, Partial<CreateLevelOutcomeInput>[]>;
  salaryRanges: Record<string, Partial<CreateSalaryRangeInput>>;
}

// ===========================================
// ANALYTICS
// ===========================================

export interface CompensationAnalytics {
  internal_equity_score: number;
  compression_ratio: number;
  top_of_range_percentage: number;
  cost_per_level: Record<string, number>;
  salary_performance_correlation: number;
  turnover_risk_count: number;
}

// ===========================================
// AI COPILOT
// ===========================================

export interface CompensationInconsistency {
  id: string;
  type: 'salary_inversion' | 'compression' | 'top_of_range' | 'performance_mismatch' | 'missing_criteria';
  severity: 'error' | 'warning' | 'info';
  message: string;
  affected_entities: string[];
  suggested_action?: string;
}

export interface CompensationSuggestion {
  id: string;
  type: 'structure' | 'mission' | 'level' | 'salary';
  title: string;
  description: string;
  confidence: number;
  data?: Record<string, unknown>;
}
