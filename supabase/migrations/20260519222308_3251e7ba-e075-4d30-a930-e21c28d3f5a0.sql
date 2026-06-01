ALTER TABLE public.culture_interview_sessions
  ADD COLUMN IF NOT EXISTS can_resume boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resume_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_culture_sessions_can_resume
  ON public.culture_interview_sessions (can_resume, resume_expires_at)
  WHERE can_resume = true;