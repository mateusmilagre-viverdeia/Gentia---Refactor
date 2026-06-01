-- Trigger to auto-populate published_at when status changes to 'active'
CREATE OR REPLACE FUNCTION public.auto_set_published_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_set_published_at
BEFORE INSERT OR UPDATE ON public.recruitment_jobs
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_published_at();

-- Backfill existing active jobs with NULL published_at
UPDATE public.recruitment_jobs
SET published_at = COALESCE(created_at, now())
WHERE status = 'active' AND published_at IS NULL;