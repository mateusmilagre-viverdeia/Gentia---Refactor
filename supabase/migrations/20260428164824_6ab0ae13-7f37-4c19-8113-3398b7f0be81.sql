-- Fix the broken trigger function that referenced a non-existent column
CREATE OR REPLACE FUNCTION public.auto_populate_process_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_candidate RECORD;
  v_job RECORD;
  v_final_status TEXT;
  v_was_shortlisted BOOLEAN;
BEGIN
  IF NEW.status NOT IN ('hired', 'rejected', 'disqualified', 'withdrawn') THEN
    RETURN NEW;
  END IF;

  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_final_status := CASE NEW.status
    WHEN 'hired' THEN 'hired'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'disqualified' THEN 'rejected'
    WHEN 'withdrawn' THEN 'withdrew'
    ELSE 'unknown'
  END;

  SELECT * INTO v_candidate FROM recruitment_candidates WHERE id = NEW.candidate_id;
  IF v_candidate IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_job FROM recruitment_jobs WHERE id = NEW.job_id;

  -- FIX: use status (the real column) instead of the non-existent "stage"
  SELECT EXISTS (
    SELECT 1 FROM recruitment_applications
    WHERE candidate_id = NEW.candidate_id
      AND job_id = NEW.job_id
      AND status IN ('shortlist', 'final_interview', 'offer')
  ) INTO v_was_shortlisted;

  IF EXISTS (
    SELECT 1 FROM candidate_process_history
    WHERE candidate_id = NEW.candidate_id
      AND job_id = NEW.job_id
  ) THEN
    UPDATE candidate_process_history
    SET final_status = v_final_status,
        was_shortlisted = v_was_shortlisted,
        participated_at = now()
    WHERE candidate_id = NEW.candidate_id
      AND job_id = NEW.job_id;
    RETURN NEW;
  END IF;

  INSERT INTO candidate_process_history (
    account_id, candidate_id, job_id, job_title,
    final_status, was_shortlisted, participated_at
  ) VALUES (
    v_candidate.account_id,
    NEW.candidate_id,
    NEW.job_id,
    COALESCE(v_job.title, 'Vaga não identificada'),
    v_final_status,
    v_was_shortlisted,
    now()
  );

  RETURN NEW;
END;
$function$;

-- Backfill: sync applications stuck in non-hired status when candidate+job are already hired
UPDATE recruitment_applications a
SET status = 'hired', updated_at = now()
FROM recruitment_candidates c, recruitment_jobs j
WHERE a.candidate_id = c.id
  AND a.job_id = j.id
  AND c.stage = 'hired'
  AND j.status = 'filled'
  AND a.status <> 'hired';