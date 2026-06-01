
ALTER TABLE public.culture_interview_sessions
  ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER;

ALTER TABLE public.technical_interview_sessions
  ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER;

COMMENT ON COLUMN public.culture_interview_sessions.audio_duration_seconds IS
  'Real audio duration in seconds, probed from the uploaded WebM file. Ground truth for billing.';
COMMENT ON COLUMN public.technical_interview_sessions.audio_duration_seconds IS
  'Real audio duration in seconds, probed from the uploaded WebM file. Ground truth for billing.';
