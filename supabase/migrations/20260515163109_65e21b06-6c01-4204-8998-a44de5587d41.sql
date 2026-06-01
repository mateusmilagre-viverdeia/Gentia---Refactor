
-- 1) Reforço do trigger contra race condition: ON CONFLICT + re-SELECT
CREATE OR REPLACE FUNCTION public.resolve_candidate_id_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_first_name text;
  v_last_name text;
  v_candidate_id uuid;
BEGIN
  IF NEW.candidate_id IS NOT NULL OR NEW.candidate_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT cp.user_id, cp.first_name, cp.last_name
    INTO v_user_id, v_first_name, v_last_name
  FROM public.candidate_profiles cp
  WHERE cp.id = NEW.candidate_profile_id;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.email INTO v_email FROM public.profiles p WHERE p.id = v_user_id;
  IF v_email IS NULL OR length(trim(v_email)) = 0 THEN
    SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_user_id;
  END IF;

  IF v_email IS NULL OR length(trim(v_email)) = 0 THEN
    RETURN NEW;
  END IF;

  v_email := lower(trim(v_email));

  SELECT rc.id INTO v_candidate_id
  FROM public.recruitment_candidates rc
  WHERE rc.account_id = NEW.account_id
    AND lower(rc.email) = v_email
  LIMIT 1;

  IF v_candidate_id IS NULL THEN
    BEGIN
      INSERT INTO public.recruitment_candidates (
        account_id, email, first_name, last_name, source
      ) VALUES (
        NEW.account_id,
        v_email,
        coalesce(v_first_name, split_part(v_email, '@', 1)),
        v_last_name,
        'self_application'
      )
      RETURNING id INTO v_candidate_id;
    EXCEPTION WHEN unique_violation THEN
      -- Race condition: another transaction inserted the same candidate
      SELECT rc.id INTO v_candidate_id
      FROM public.recruitment_candidates rc
      WHERE rc.account_id = NEW.account_id
        AND lower(rc.email) = v_email
      LIMIT 1;
    END;
  END IF;

  NEW.candidate_id := v_candidate_id;
  RETURN NEW;
END;
$$;

-- 2) CHECK constraints NOT VALID (não bloqueia linhas legadas)
ALTER TABLE public.culture_interview_sessions
  DROP CONSTRAINT IF EXISTS chk_culture_session_has_identifier;
ALTER TABLE public.culture_interview_sessions
  ADD CONSTRAINT chk_culture_session_has_identifier
  CHECK (candidate_id IS NOT NULL OR candidate_profile_id IS NOT NULL) NOT VALID;

ALTER TABLE public.candidate_disc_sessions
  DROP CONSTRAINT IF EXISTS chk_disc_session_has_identifier;
ALTER TABLE public.candidate_disc_sessions
  ADD CONSTRAINT chk_disc_session_has_identifier
  CHECK (candidate_id IS NOT NULL OR candidate_profile_id IS NOT NULL) NOT VALID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='technical_interview_sessions'
      AND column_name='candidate_profile_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.technical_interview_sessions DROP CONSTRAINT IF EXISTS chk_tech_session_has_identifier';
    EXECUTE 'ALTER TABLE public.technical_interview_sessions
             ADD CONSTRAINT chk_tech_session_has_identifier
             CHECK (candidate_id IS NOT NULL OR candidate_profile_id IS NOT NULL) NOT VALID';
  END IF;
END $$;
