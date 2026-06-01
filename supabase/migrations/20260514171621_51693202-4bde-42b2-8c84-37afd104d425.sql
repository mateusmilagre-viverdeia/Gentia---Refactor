
-- Resilience columns for voice interview sessions
ALTER TABLE public.culture_interview_sessions
  ADD COLUMN IF NOT EXISTS is_partial_evaluation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS audio_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS abandoned_reason text,
  ADD COLUMN IF NOT EXISTS watchdog_processed_at timestamptz;

ALTER TABLE public.technical_interview_sessions
  ADD COLUMN IF NOT EXISTS is_partial_evaluation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS audio_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS abandoned_reason text,
  ADD COLUMN IF NOT EXISTS watchdog_processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS partial_transcript text;

CREATE INDEX IF NOT EXISTS idx_tech_sessions_last_activity
  ON public.technical_interview_sessions (last_activity_at)
  WHERE status = 'in_progress';

CREATE INDEX IF NOT EXISTS idx_culture_sessions_partial
  ON public.culture_interview_sessions (is_partial_evaluation)
  WHERE is_partial_evaluation = true;

CREATE INDEX IF NOT EXISTS idx_tech_sessions_partial
  ON public.technical_interview_sessions (is_partial_evaluation)
  WHERE is_partial_evaluation = true;

-- Backfill audio_status from existing audio_url
UPDATE public.culture_interview_sessions
  SET audio_status = CASE WHEN audio_url IS NOT NULL THEN 'available' ELSE 'missing' END
  WHERE audio_status = 'unknown';

UPDATE public.technical_interview_sessions
  SET audio_status = CASE WHEN audio_url IS NOT NULL THEN 'available' ELSE 'missing' END
  WHERE audio_status = 'unknown';
