export type Seniority = 'junior' | 'pleno' | 'senior' | 'lead' | 'specialist';
export type CommunicationStyle = 'direto' | 'colaborativo' | 'formal';
export type WorkContext = 'remoto' | 'hibrido' | 'presencial';
export type GeneratedBy = 'ai' | 'manual';
export type TenurePenalty = 'ignore' | 'penalize' | 'eliminate';

export interface JobICP {
  id: string;
  job_id: string;
  account_id: string;
  
  // Core fields
  role: string;
  seniority: Seniority;
  
  // Skills
  mandatory_skills: string[];
  nice_to_have: string[];
  
  // Experience
  experience_years_min: number | null;
  experience_years_max: number | null;
  
  // Culture
  culture_traits_required: string[];
  deal_breakers: string[];
  
  // Work context
  communication_style: CommunicationStyle | null;
  work_context: WorkContext | null;
  
  // Hunting config
  confidence_threshold: number;
  search_keywords: string[];
  target_sources: string[];
  
  // Strategic hunting fields
  target_title: string | null;
  target_companies: string[];
  target_locations: string[];
  keywords: string[];
  negative_keywords: string[];
  title_variations: string[];
  min_hunting_score: number;
  industry_preferences: string[];
  salary_range_min: number | null;
  salary_range_max: number | null;
  
  // Discovery filters (NEW)
  company_size_ranges: string[];
  openness_signals: string[];
  excluded_current_titles: string[];
  
  // Scoring enrichment (NEW)
  valued_previous_roles: string[];
  negative_trajectory_patterns: string[];
  reference_companies: string[];
  tenure_min_months: number | null;
  tenure_penalty: TenurePenalty;
  
  // Pre-computed search configs
  linkedin_boolean_query: string | null;
  apollo_filters_json: ApolloFiltersJson;
  sales_navigator_url: string | null;
  scoring_weights: ScoringWeights;
  
  // Metadata
  generated_by: GeneratedBy;
  version: number;
  is_active: boolean;
  
  // Learning from approved candidates
  learned_patterns: LearnedPatterns | null;
  approved_candidates_count: number;
  last_calibrated_at: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface ScoringWeights {
  required: number;   // default 0.4
  desired: number;    // default 0.2
  experience: number; // default 0.2
  culture: number;    // default 0.2
}

export interface ApolloFiltersJson {
  person_titles?: string[];
  person_seniorities?: string[];
  person_locations?: string[];
  organization_domains?: string[];
  q_organization_name?: string;
  q_keywords?: string;
  organization_num_employees_ranges?: string[];
  person_not_titles?: string[];
  [key: string]: unknown;
}

export interface LearnedPatterns {
  disc_dominant_profiles?: { profile: string; percentage: number }[];
  common_skills?: { skill: string; frequency: number }[];
  experience_range?: { min: number; max: number; avg: number };
  cultural_traits?: { trait: string; frequency: number }[];
  insights?: string[];
}

export interface JobICPInput {
  role: string;
  seniority: Seniority;
  mandatory_skills: string[];
  nice_to_have?: string[];
  experience_years_min?: number | null;
  experience_years_max?: number | null;
  culture_traits_required?: string[];
  deal_breakers?: string[];
  communication_style?: CommunicationStyle | null;
  work_context?: WorkContext | null;
  confidence_threshold?: number;
  search_keywords?: string[];
  target_sources?: string[];
  target_title?: string | null;
  target_companies?: string[];
  target_locations?: string[];
  keywords?: string[];
  negative_keywords?: string[];
  title_variations?: string[];
  min_hunting_score?: number;
  industry_preferences?: string[];
  salary_range_min?: number | null;
  salary_range_max?: number | null;
  linkedin_boolean_query?: string | null;
  apollo_filters_json?: ApolloFiltersJson;
  sales_navigator_url?: string | null;
  scoring_weights?: ScoringWeights;
  // Discovery filters (NEW)
  company_size_ranges?: string[];
  openness_signals?: string[];
  excluded_current_titles?: string[];
  // Scoring enrichment (NEW)
  valued_previous_roles?: string[];
  negative_trajectory_patterns?: string[];
  reference_companies?: string[];
  tenure_min_months?: number | null;
  tenure_penalty?: TenurePenalty;
}

export interface ICPScoreBreakdown {
  mandatory_skills_match: number;  // 0-100, weight 40%
  nice_to_have_match: number;      // 0-100, weight 20%
  experience_fit: number;          // 0-100, weight 20%
  culture_fit: number;             // 0-100, weight 20%
  total_score: number;             // 0-100 weighted average
  details: {
    matched_mandatory: string[];
    missed_mandatory: string[];
    matched_nice_to_have: string[];
    experience_years_detected: number | null;
    culture_traits_detected: string[];
    deal_breaker_flags: string[];
  };
}

export interface GenerateICPResponse {
  success: boolean;
  icp?: JobICP;
  error?: string;
}

export const SENIORITY_LABELS: Record<Seniority, string> = {
  junior: 'Júnior',
  pleno: 'Pleno',
  senior: 'Sênior',
  lead: 'Lead',
  specialist: 'Especialista',
};

export const COMMUNICATION_STYLE_LABELS: Record<CommunicationStyle, string> = {
  direto: 'Direto',
  colaborativo: 'Colaborativo',
  formal: 'Formal',
};

export const WORK_CONTEXT_LABELS: Record<WorkContext, string> = {
  remoto: 'Remoto',
  hibrido: 'Híbrido',
  presencial: 'Presencial',
};

export const DEFAULT_TARGET_SOURCES = ['linkedin'];
export const DEFAULT_CONFIDENCE_THRESHOLD = 60;

export const COMPANY_SIZE_OPTIONS: { value: string; label: string }[] = [
  { value: '1,50', label: 'Startup inicial (1-50)' },
  { value: '51,200', label: 'Startup em crescimento (51-200)' },
  { value: '201,1000', label: 'Scale-up (201-1.000)' },
  { value: '1001,5000', label: 'Médio porte (1.001-5.000)' },
  { value: '5001,10000+', label: 'Grande porte / Corporação (5.001+)' },
];

export const OPENNESS_SIGNAL_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: 'open_to_work', label: 'Aberto a Oportunidades', description: 'Candidato sinalizou que está aberto a novas oportunidades' },
  { value: 'changed_jobs_90d', label: 'Mudou de emprego (últimos 90 dias)', description: 'Alta receptividade — pode estar insatisfeito ou aberto' },
  { value: 'shared_connections', label: 'Conexões em comum', description: 'Conectado à empresa contratante — maior aceitação' },
  { value: 'mentioned_in_news', label: 'Mencionado em notícias', description: 'Exposição pública — pode estar aberto a se movimentar' },
];

export const TENURE_PENALTY_OPTIONS: { value: TenurePenalty; label: string }[] = [
  { value: 'ignore', label: 'Não avaliar' },
  { value: 'penalize', label: 'Penalizar (-1 na pontuação)' },
  { value: 'eliminate', label: 'Eliminar (pontuação = 0)' },
];
