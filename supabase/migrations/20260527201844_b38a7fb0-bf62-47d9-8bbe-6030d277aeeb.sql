CREATE OR REPLACE FUNCTION public.invalidate_cv_match_cache_on_job_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.description IS DISTINCT FROM OLD.description)
     OR (NEW.job_description_id IS DISTINCT FROM OLD.job_description_id) THEN
    DELETE FROM public.cv_match_cache WHERE job_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;