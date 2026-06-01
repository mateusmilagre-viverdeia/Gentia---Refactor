
-- Add columns to support organic candidate cross-matching and tracking reallocation
ALTER TABLE public.recruitment_cross_match_suggestions
  ADD COLUMN IF NOT EXISTS source_candidate_id UUID REFERENCES public.recruitment_candidates(id),
  ADD COLUMN IF NOT EXISTS imported_to_job_id UUID REFERENCES public.recruitment_jobs(id),
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

-- Make source_result_id nullable (since organic candidates don't have a hunting result)
ALTER TABLE public.recruitment_cross_match_suggestions
  ALTER COLUMN source_result_id DROP NOT NULL;

-- Create the trigger function for cross-match on rejection
CREATE OR REPLACE FUNCTION public.trigger_cross_match_on_rejection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_name TEXT;
  v_source_job_title TEXT;
  v_target_job RECORD;
BEGIN
  -- Only fire when status changes TO rejected
  IF NEW.status != 'rejected' OR (OLD.status = 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Get candidate name
  SELECT name INTO v_candidate_name
  FROM recruitment_candidates
  WHERE id = NEW.candidate_id;

  -- Get source job title
  SELECT title INTO v_source_job_title
  FROM recruitment_jobs
  WHERE id = NEW.job_id;

  -- Find other active jobs in the same account that have ICPs
  FOR v_target_job IN
    SELECT rj.id AS job_id, rj.title AS job_title
    FROM recruitment_jobs rj
    INNER JOIN job_icps ji ON ji.job_id = rj.id AND ji.is_active = true
    WHERE rj.account_id = NEW.account_id
      AND rj.id != NEW.job_id
      AND rj.status IN ('active', 'published', 'open')
      -- Avoid duplicates
      AND NOT EXISTS (
        SELECT 1 FROM recruitment_cross_match_suggestions cms
        WHERE cms.source_candidate_id = NEW.candidate_id
          AND cms.suggested_job_id = rj.id
          AND cms.status IN ('pending', 'accepted')
      )
  LOOP
    INSERT INTO recruitment_cross_match_suggestions (
      account_id, source_candidate_id, source_job_id, suggested_job_id,
      match_score, reasoning, status
    ) VALUES (
      NEW.account_id, NEW.candidate_id, NEW.job_id, v_target_job.job_id,
      0, 'Candidato reprovado em "' || COALESCE(v_source_job_title, '') || '" — pendente avaliação IA para "' || v_target_job.job_title || '"',
      'pending_ai_review'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_cross_match_on_rejection ON public.recruitment_applications;
CREATE TRIGGER trg_cross_match_on_rejection
  AFTER UPDATE ON public.recruitment_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_cross_match_on_rejection();
