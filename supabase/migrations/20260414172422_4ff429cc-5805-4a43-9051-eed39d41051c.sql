
-- Add auto-retry columns to culture_interview_sessions
ALTER TABLE public.culture_interview_sessions
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS completed_naturally BOOLEAN DEFAULT NULL;

-- Add auto-retry columns to technical_interview_sessions
ALTER TABLE public.technical_interview_sessions
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS completed_naturally BOOLEAN DEFAULT NULL;

-- Add auto-retry column to candidate_disc_sessions
ALTER TABLE public.candidate_disc_sessions
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1;
