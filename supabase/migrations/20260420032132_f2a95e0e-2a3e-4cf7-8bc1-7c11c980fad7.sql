-- 1. Add do_not_reapproach flag to recruitment_applications (for warranty inheritance)
ALTER TABLE public.recruitment_applications
  ADD COLUMN IF NOT EXISTS do_not_reapproach boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inherited_from_job_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_recruitment_applications_do_not_reapproach
  ON public.recruitment_applications(job_id) WHERE do_not_reapproach = true;

-- 2. Trigger function: when a job becomes active/published, fire crossmatch-executar
CREATE OR REPLACE FUNCTION public.trigger_cross_match_on_job_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text;
  v_service_key text;
  v_should_fire boolean := false;
BEGIN
  -- Fire on INSERT of an active/published job, OR on UPDATE when status transitions into active/published
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('active', 'published') THEN
      v_should_fire := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IN ('active', 'published')
       AND (OLD.status IS DISTINCT FROM NEW.status)
       AND OLD.status NOT IN ('active', 'published') THEN
      v_should_fire := true;
    END IF;
  END IF;

  IF NOT v_should_fire THEN
    RETURN NEW;
  END IF;

  -- Read URL/key from vault settings (set by the project)
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    -- Settings not present in this environment; silently skip without breaking the insert/update
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/crossmatch-executar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'trigger', 'job_created',
      'vaga_id', NEW.id,
      'account_id', NEW.account_id
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the underlying transaction because of background trigger errors
  RAISE WARNING 'trigger_cross_match_on_job_created failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recruitment_jobs_cross_match_on_create ON public.recruitment_jobs;
CREATE TRIGGER recruitment_jobs_cross_match_on_create
  AFTER INSERT OR UPDATE OF status ON public.recruitment_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_cross_match_on_job_created();