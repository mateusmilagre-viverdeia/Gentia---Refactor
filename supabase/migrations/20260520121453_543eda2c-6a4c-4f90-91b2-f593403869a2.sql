ALTER TABLE public.culture_interview_sessions
  ADD COLUMN IF NOT EXISTS credits_consumed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.technical_interview_sessions
  ADD COLUMN IF NOT EXISTS credits_consumed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_culture_sessions_credits_consumed_at
  ON public.culture_interview_sessions (credits_consumed_at)
  WHERE credits_consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_technical_sessions_credits_consumed_at
  ON public.technical_interview_sessions (credits_consumed_at)
  WHERE credits_consumed_at IS NULL;