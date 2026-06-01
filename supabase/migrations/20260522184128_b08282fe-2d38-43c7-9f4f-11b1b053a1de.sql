
-- Adds 'failed_technical' to the allowed statuses for voice interview sessions
-- and a credits_reverted_at timestamp to track refunds when sessions fail
-- without producing any candidate response (mic muted, WebRTC drop, etc).

-- Culture
ALTER TABLE public.culture_interview_sessions
  DROP CONSTRAINT IF EXISTS culture_interview_sessions_status_check;
ALTER TABLE public.culture_interview_sessions
  ADD CONSTRAINT culture_interview_sessions_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'abandoned'::text, 'failed_technical'::text]));

ALTER TABLE public.culture_interview_sessions
  ADD COLUMN IF NOT EXISTS credits_reverted_at TIMESTAMPTZ;

-- Technical
ALTER TABLE public.technical_interview_sessions
  DROP CONSTRAINT IF EXISTS technical_interview_sessions_status_check;
ALTER TABLE public.technical_interview_sessions
  ADD CONSTRAINT technical_interview_sessions_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'expired'::text, 'abandoned'::text, 'failed_technical'::text]));

ALTER TABLE public.technical_interview_sessions
  ADD COLUMN IF NOT EXISTS credits_reverted_at TIMESTAMPTZ;

-- Index to speed up recruiter banner queries (latest failed_technical per candidate)
CREATE INDEX IF NOT EXISTS idx_culture_sessions_failed_technical
  ON public.culture_interview_sessions (candidate_id, completed_at DESC)
  WHERE status = 'failed_technical';

CREATE INDEX IF NOT EXISTS idx_technical_sessions_failed_technical
  ON public.technical_interview_sessions (candidate_id, completed_at DESC)
  WHERE status = 'failed_technical';
