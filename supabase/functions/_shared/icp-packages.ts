/**
 * ICP Field Router — Routes ICP fields to the right tools at each pipeline stage.
 * 
 * Each tool only receives the fields it can actually use:
 * - Discovery (Apollo/Evaboot): search filters only
 * - Scoring (LLM post-scrape): evaluation criteria only
 * - Outreach (WhatsApp/Email): communication context only
 * - Qualification (agent): interview criteria only
 */

// ============== INTERFACES ==============

export interface DiscoveryPackage {
  /** Merged: target_title + role + title_variations (deduplicated) */
  person_titles: string[];
  target_companies: string[];
  person_locations: string[];
  seniority_apollo: string[];
  seniority_raw: string | null;
  keywords: string[];
  negative_keywords: string[];
  linkedin_boolean_query: string | null;
  sales_navigator_url: string | null;
  apollo_filters_json: Record<string, unknown>;
  // NEW: Discovery filters
  company_size_ranges: string[];
  excluded_current_titles: string[];
  openness_signals: string[];
}

export interface ScoringPackage {
  mandatory_skills: string[];
  nice_to_have: string[];
  deal_breakers: string[];
  seniority: string | null;
  experience_years_min: number | null;
  experience_years_max: number | null;
  culture_traits_required: string[];
  work_context: string | null;
  scoring_weights: { required: number; desired: number; experience: number; culture: number };
  learned_patterns: any;
  target_companies: string[];
  industry_preferences: string[];
  min_hunting_score: number;
  // NEW: Scoring enrichment fields
  valued_previous_roles: string[];
  negative_trajectory_patterns: string[];
  reference_companies: string[];
  tenure_min_months: number | null;
  tenure_penalty: string;
}

export interface OutreachPackage {
  communication_style: string | null;
  work_context: string | null;
  salary_range_min: number | null;
  salary_range_max: number | null;
  culture_traits_required: string[];
}

export interface QualificationPackage {
  deal_breakers: string[];
  salary_range_min: number | null;
  salary_range_max: number | null;
  work_context: string | null;
  mandatory_skills: string[];
  experience_years_min: number | null;
  experience_years_max: number | null;
  seniority: string | null;
}

// ============== SENIORITY MAPPING (centralized) ==============

const SENIORITY_TO_APOLLO: Record<string, string[]> = {
  'junior': ['entry'],
  'pleno': ['senior'],
  'senior': ['senior', 'manager'],
  'lead': ['manager', 'director'],
  'specialist': ['senior', 'manager'],
  'gerente': ['manager', 'director'],
  'diretor': ['director', 'vp'],
  'c-level': ['c_suite', 'vp'],
};

export function mapSeniorityToApollo(seniority: string | null | undefined): string[] {
  if (!seniority) return [];
  return SENIORITY_TO_APOLLO[seniority.toLowerCase()] || [];
}

// ============== PACKAGE BUILDERS ==============

export function buildDiscoveryPackage(icp: any): DiscoveryPackage {
  // Merge all title sources, deduplicate
  const titlesSet = new Set<string>();
  if (icp?.target_title) titlesSet.add(icp.target_title);
  if (icp?.role && icp.role !== icp?.target_title) titlesSet.add(icp.role);
  if (Array.isArray(icp?.title_variations)) {
    for (const v of icp.title_variations) {
      if (v && typeof v === 'string') titlesSet.add(v);
    }
  }

  return {
    person_titles: Array.from(titlesSet),
    target_companies: icp?.target_companies || [],
    person_locations: icp?.target_locations || [],
    seniority_apollo: mapSeniorityToApollo(icp?.seniority),
    seniority_raw: icp?.seniority || null,
    keywords: icp?.keywords || [],
    negative_keywords: icp?.negative_keywords || [],
    linkedin_boolean_query: icp?.linkedin_boolean_query || null,
    sales_navigator_url: icp?.sales_navigator_url || null,
    apollo_filters_json: icp?.apollo_filters_json || {},
    // NEW
    company_size_ranges: icp?.company_size_ranges || [],
    excluded_current_titles: icp?.excluded_current_titles || [],
    openness_signals: icp?.openness_signals || [],
  };
}

export function buildScoringPackage(icp: any): ScoringPackage {
  const defaultWeights = { required: 0.4, desired: 0.2, experience: 0.2, culture: 0.2 };
  return {
    mandatory_skills: icp?.mandatory_skills || [],
    nice_to_have: icp?.nice_to_have || [],
    deal_breakers: icp?.deal_breakers || [],
    seniority: icp?.seniority || null,
    experience_years_min: icp?.experience_years_min ?? null,
    experience_years_max: icp?.experience_years_max ?? null,
    culture_traits_required: icp?.culture_traits_required || [],
    work_context: icp?.work_context || null,
    scoring_weights: icp?.scoring_weights || defaultWeights,
    learned_patterns: icp?.learned_patterns || null,
    target_companies: icp?.target_companies || [],
    industry_preferences: icp?.industry_preferences || [],
    min_hunting_score: icp?.min_hunting_score ?? 50,
    // NEW
    valued_previous_roles: icp?.valued_previous_roles || [],
    negative_trajectory_patterns: icp?.negative_trajectory_patterns || [],
    reference_companies: icp?.reference_companies || [],
    tenure_min_months: icp?.tenure_min_months ?? null,
    tenure_penalty: icp?.tenure_penalty || 'ignore',
  };
}

export function buildOutreachPackage(icp: any): OutreachPackage {
  return {
    communication_style: icp?.communication_style || null,
    work_context: icp?.work_context || null,
    salary_range_min: icp?.salary_range_min ?? null,
    salary_range_max: icp?.salary_range_max ?? null,
    culture_traits_required: icp?.culture_traits_required || [],
  };
}

export function buildQualificationPackage(icp: any): QualificationPackage {
  return {
    deal_breakers: icp?.deal_breakers || [],
    salary_range_min: icp?.salary_range_min ?? null,
    salary_range_max: icp?.salary_range_max ?? null,
    work_context: icp?.work_context || null,
    mandatory_skills: icp?.mandatory_skills || [],
    experience_years_min: icp?.experience_years_min ?? null,
    experience_years_max: icp?.experience_years_max ?? null,
    seniority: icp?.seniority || null,
  };
}
