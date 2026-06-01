
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
  END IF;

  NEW.candidate_id := v_candidate_id;
  RETURN NEW;
END;
$$;

UPDATE public.culture_interview_sessions
SET candidate_profile_id = candidate_profile_id
WHERE candidate_id IS NULL AND candidate_profile_id IS NOT NULL;

UPDATE public.candidate_disc_sessions
SET candidate_profile_id = candidate_profile_id
WHERE candidate_id IS NULL AND candidate_profile_id IS NOT NULL;
