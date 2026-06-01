CREATE TABLE public.cv_match_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_hash text NOT NULL,
  job_id uuid NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  match_score numeric(5,2),
  recommendation text,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_used text,
  tokens_used integer,
  estimated_cost numeric(10,6),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  UNIQUE (cv_hash, job_id)
);

CREATE INDEX idx_cv_match_cache_lookup ON public.cv_match_cache (cv_hash, job_id, expires_at);
CREATE INDEX idx_cv_match_cache_job ON public.cv_match_cache (job_id);
CREATE INDEX idx_cv_match_cache_account ON public.cv_match_cache (account_id, created_at DESC);

ALTER TABLE public.cv_match_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can read cv_match_cache"
ON public.cv_match_cache FOR SELECT
USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Service role can manage cv_match_cache"
ON public.cv_match_cache FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger: invalidate cache when job description/requirements change
CREATE OR REPLACE FUNCTION public.invalidate_cv_match_cache_on_job_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.description IS DISTINCT FROM OLD.description)
     OR (NEW.requirements IS DISTINCT FROM OLD.requirements)
     OR (NEW.job_description_id IS DISTINCT FROM OLD.job_description_id) THEN
    DELETE FROM public.cv_match_cache WHERE job_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invalidate_cv_match_cache ON public.recruitment_jobs;
CREATE TRIGGER trg_invalidate_cv_match_cache
AFTER UPDATE ON public.recruitment_jobs
FOR EACH ROW
EXECUTE FUNCTION public.invalidate_cv_match_cache_on_job_update();