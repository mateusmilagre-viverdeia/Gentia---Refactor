ALTER TABLE public.technical_interview_sessions
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tech_sessions_is_test
  ON public.technical_interview_sessions (is_test)
  WHERE is_test = true;