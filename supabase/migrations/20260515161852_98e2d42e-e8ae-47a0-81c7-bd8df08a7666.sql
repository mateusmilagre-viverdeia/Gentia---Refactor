
DROP TRIGGER IF EXISTS trg_resolve_candidate_id_culture ON public.culture_interview_sessions;
CREATE TRIGGER trg_resolve_candidate_id_culture
  BEFORE INSERT OR UPDATE OF candidate_profile_id, candidate_id
  ON public.culture_interview_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.resolve_candidate_id_from_profile();

DROP TRIGGER IF EXISTS trg_resolve_candidate_id_disc ON public.candidate_disc_sessions;
CREATE TRIGGER trg_resolve_candidate_id_disc
  BEFORE INSERT OR UPDATE OF candidate_profile_id, candidate_id
  ON public.candidate_disc_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.resolve_candidate_id_from_profile();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='technical_interview_sessions'
      AND column_name='candidate_profile_id'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_resolve_candidate_id_tech ON public.technical_interview_sessions';
    EXECUTE 'CREATE TRIGGER trg_resolve_candidate_id_tech
      BEFORE INSERT OR UPDATE OF candidate_profile_id, candidate_id
      ON public.technical_interview_sessions
      FOR EACH ROW
      EXECUTE FUNCTION public.resolve_candidate_id_from_profile()';
  END IF;
END $$;

UPDATE public.culture_interview_sessions
SET candidate_profile_id = candidate_profile_id
WHERE candidate_id IS NULL AND candidate_profile_id IS NOT NULL;

UPDATE public.candidate_disc_sessions
SET candidate_profile_id = candidate_profile_id
WHERE candidate_id IS NULL AND candidate_profile_id IS NOT NULL;
