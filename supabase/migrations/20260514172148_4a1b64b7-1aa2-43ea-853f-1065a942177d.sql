
ALTER TABLE public.technical_interview_sessions
  DROP CONSTRAINT IF EXISTS technical_interview_sessions_status_check;

ALTER TABLE public.technical_interview_sessions
  ADD CONSTRAINT technical_interview_sessions_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'expired'::text, 'abandoned'::text]));
