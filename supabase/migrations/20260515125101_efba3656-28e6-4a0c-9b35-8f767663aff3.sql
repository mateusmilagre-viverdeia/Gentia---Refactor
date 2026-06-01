
-- 1. New columns on recruitment_hunting_results
ALTER TABLE public.recruitment_hunting_results
  ADD COLUMN IF NOT EXISTS final_score_llm numeric,
  ADD COLUMN IF NOT EXISTS llm_tier text CHECK (llm_tier IN ('A','B','C')),
  ADD COLUMN IF NOT EXISTS llm_red_flags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS llm_justification text,
  ADD COLUMN IF NOT EXISTS llm_evaluated_at timestamptz,
  ADD COLUMN IF NOT EXISTS completeness_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_low_quality boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejection_signals jsonb;

CREATE INDEX IF NOT EXISTS idx_hunting_results_low_quality
  ON public.recruitment_hunting_results(search_id, is_low_quality);
CREATE INDEX IF NOT EXISTS idx_hunting_results_llm_tier
  ON public.recruitment_hunting_results(search_id, llm_tier);

-- 2. Completeness compute function + trigger
CREATE OR REPLACE FUNCTION public.compute_hunting_completeness(d jsonb)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  score integer := 0;
  has_title boolean;
  has_company boolean;
  has_headline boolean;
  has_photo boolean;
  has_location boolean;
  has_experiences boolean;
  has_skills boolean;
  has_summary boolean;
BEGIN
  IF d IS NULL THEN RETURN 0; END IF;

  has_title := COALESCE(NULLIF(d->>'currentTitle',''), NULLIF(d->>'title',''), NULLIF(d->>'headline','')) IS NOT NULL;
  has_company := COALESCE(NULLIF(d->>'currentCompany',''), NULLIF(d->>'company','')) IS NOT NULL;
  has_headline := COALESCE(NULLIF(d->>'headline',''), NULLIF(d->>'description','')) IS NOT NULL;
  has_photo := COALESCE(NULLIF(d->>'photoUrl',''), NULLIF(d->>'profileImageUrl',''), NULLIF(d->>'avatar','')) IS NOT NULL;
  has_location := COALESCE(NULLIF(d->>'location',''), NULLIF(d->>'city',''), NULLIF(d->>'country','')) IS NOT NULL;
  has_experiences := jsonb_typeof(d->'experiences') = 'array' AND jsonb_array_length(d->'experiences') >= 2;
  has_skills := (jsonb_typeof(d->'skills') = 'array' AND jsonb_array_length(d->'skills') >= 3)
                OR (jsonb_typeof(d->'topSkills') = 'array' AND jsonb_array_length(d->'topSkills') >= 3);
  has_summary := COALESCE(NULLIF(d->>'summary',''), NULLIF(d->>'about','')) IS NOT NULL;

  IF has_title THEN score := score + 20; END IF;
  IF has_company THEN score := score + 20; END IF;
  IF has_headline THEN score := score + 10; END IF;
  IF has_location THEN score := score + 10; END IF;
  IF has_experiences THEN score := score + 20; END IF;
  IF has_skills THEN score := score + 10; END IF;
  IF has_photo THEN score := score + 5; END IF;
  IF has_summary THEN score := score + 5; END IF;

  RETURN LEAST(score, 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_hunting_completeness()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.completeness_score := public.compute_hunting_completeness(NEW.extracted_data);
  NEW.is_low_quality := NEW.completeness_score < 40;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_hunting_completeness ON public.recruitment_hunting_results;
CREATE TRIGGER trg_set_hunting_completeness
BEFORE INSERT OR UPDATE OF extracted_data
ON public.recruitment_hunting_results
FOR EACH ROW
EXECUTE FUNCTION public.set_hunting_completeness();

-- Backfill existing rows
UPDATE public.recruitment_hunting_results
SET completeness_score = public.compute_hunting_completeness(extracted_data),
    is_low_quality = public.compute_hunting_completeness(extracted_data) < 40
WHERE completeness_score IS NULL OR completeness_score = 0;

-- 3. Rejection patterns table
CREATE TABLE IF NOT EXISTS public.recruitment_hunting_rejection_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  job_id uuid REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  hunting_result_id uuid REFERENCES public.recruitment_hunting_results(id) ON DELETE CASCADE,
  reason_category text NOT NULL,
  reason_detail text,
  profile_signals jsonb DEFAULT '{}'::jsonb,
  rejected_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hunting_rej_job ON public.recruitment_hunting_rejection_patterns(job_id);
CREATE INDEX IF NOT EXISTS idx_hunting_rej_account ON public.recruitment_hunting_rejection_patterns(account_id);

ALTER TABLE public.recruitment_hunting_rejection_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_rejection_patterns_account"
ON public.recruitment_hunting_rejection_patterns FOR SELECT
USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

CREATE POLICY "insert_rejection_patterns_account"
ON public.recruitment_hunting_rejection_patterns FOR INSERT
WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

CREATE POLICY "delete_rejection_patterns_account"
ON public.recruitment_hunting_rejection_patterns FOR DELETE
USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- 4. ICP suggestions table
CREATE TABLE IF NOT EXISTS public.recruitment_hunting_icp_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  suggestion_type text NOT NULL,
  field_path text,
  suggested_value jsonb,
  evidence jsonb DEFAULT '{}'::jsonb,
  rationale text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','dismissed')),
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hunting_icp_sug_job ON public.recruitment_hunting_icp_suggestions(job_id, status);

ALTER TABLE public.recruitment_hunting_icp_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_icp_suggestions_account"
ON public.recruitment_hunting_icp_suggestions FOR SELECT
USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

CREATE POLICY "insert_icp_suggestions_account"
ON public.recruitment_hunting_icp_suggestions FOR INSERT
WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

CREATE POLICY "update_icp_suggestions_account"
ON public.recruitment_hunting_icp_suggestions FOR UPDATE
USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

CREATE POLICY "delete_icp_suggestions_account"
ON public.recruitment_hunting_icp_suggestions FOR DELETE
USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
