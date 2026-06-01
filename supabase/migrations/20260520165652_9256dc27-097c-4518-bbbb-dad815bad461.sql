
-- 1) Add is_test flag to culture_interview_sessions
ALTER TABLE public.culture_interview_sessions
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_culture_interview_sessions_real
  ON public.culture_interview_sessions (account_id, created_at DESC)
  WHERE is_test = false;

CREATE INDEX IF NOT EXISTS idx_culture_interview_sessions_test
  ON public.culture_interview_sessions (account_id, created_at DESC)
  WHERE is_test = true;

-- 2) Add is_test flag to recruitment_candidates so fake candidates
--    created by simulation mode can be filtered out of listings later.
ALTER TABLE public.recruitment_candidates
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_recruitment_candidates_real
  ON public.recruitment_candidates (account_id, created_at DESC)
  WHERE is_test = false;
