
-- Flag de feature por conta
ALTER TABLE public.account_settings
  ADD COLUMN IF NOT EXISTS use_cv_intelligence_in_interviews boolean NOT NULL DEFAULT true;

-- Tabela: dados estruturados extraídos do CV
CREATE TABLE IF NOT EXISTS public.candidate_cv_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  candidate_profile_id uuid REFERENCES public.candidate_profiles(id) ON DELETE SET NULL,
  cv_url text,
  cv_hash text,
  parsed_at timestamptz NOT NULL DEFAULT now(),
  parser_version text NOT NULL DEFAULT 'hybrid_v1',
  extraction_method text NOT NULL DEFAULT 'unpdf_text',
  full_name text,
  email text,
  phone text,
  linkedin_url text,
  location text,
  professional_summary text,
  seniority_level text,
  total_years_experience numeric,
  current_position text,
  current_company text,
  work_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  education jsonb NOT NULL DEFAULT '[]'::jsonb,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  languages jsonb NOT NULL DEFAULT '[]'::jsonb,
  certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_text text,
  cost_usd numeric NOT NULL DEFAULT 0,
  tokens_used integer NOT NULL DEFAULT 0,
  parse_status text NOT NULL DEFAULT 'success',
  parse_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_cv_intel_account ON public.candidate_cv_intelligence(account_id);
CREATE INDEX IF NOT EXISTS idx_cv_intel_candidate ON public.candidate_cv_intelligence(candidate_id);
CREATE INDEX IF NOT EXISTS idx_cv_intel_profile ON public.candidate_cv_intelligence(candidate_profile_id);

ALTER TABLE public.candidate_cv_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view CV intelligence"
  ON public.candidate_cv_intelligence FOR SELECT
  USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Candidate can view own CV intelligence"
  ON public.candidate_cv_intelligence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.candidate_profiles cp
      WHERE cp.id = candidate_cv_intelligence.candidate_profile_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages CV intelligence"
  ON public.candidate_cv_intelligence FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_cv_intelligence_updated_at
  BEFORE UPDATE ON public.candidate_cv_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: cache de análise de fit candidato x vaga
CREATE TABLE IF NOT EXISTS public.candidate_cv_job_match (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  cv_intelligence_id uuid REFERENCES public.candidate_cv_intelligence(id) ON DELETE SET NULL,
  match_score numeric,
  recommendation text,
  skills_matched jsonb NOT NULL DEFAULT '[]'::jsonb,
  skills_missing jsonb NOT NULL DEFAULT '[]'::jsonb,
  skills_extra jsonb NOT NULL DEFAULT '[]'::jsonb,
  red_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  interview_focus_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  icp_version_used text,
  model_used text,
  cost_usd numeric NOT NULL DEFAULT 0,
  credits_consumed numeric NOT NULL DEFAULT 0,
  triggered_by uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_cv_match_account ON public.candidate_cv_job_match(account_id);
CREATE INDEX IF NOT EXISTS idx_cv_match_candidate_job ON public.candidate_cv_job_match(candidate_id, job_id);
CREATE INDEX IF NOT EXISTS idx_cv_match_expires ON public.candidate_cv_job_match(expires_at);

ALTER TABLE public.candidate_cv_job_match ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view CV job match"
  ON public.candidate_cv_job_match FOR SELECT
  USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Service role manages CV job match"
  ON public.candidate_cv_job_match FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_cv_job_match_updated_at
  BEFORE UPDATE ON public.candidate_cv_job_match
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
