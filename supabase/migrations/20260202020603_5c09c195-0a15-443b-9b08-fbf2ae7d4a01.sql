-- Add columns for real-time persistence
ALTER TABLE public.culture_interview_sessions 
ADD COLUMN IF NOT EXISTS partial_transcript TEXT,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS connection_lost_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recovery_attempted BOOLEAN DEFAULT FALSE;

-- Index for finding abandoned sessions efficiently
CREATE INDEX IF NOT EXISTS idx_culture_sessions_last_activity 
ON public.culture_interview_sessions(last_activity_at) 
WHERE status = 'in_progress';

-- Comment explaining the purpose
COMMENT ON COLUMN public.culture_interview_sessions.partial_transcript IS 'Transcript accumulated during interview via heartbeat - fallback for connection loss';
COMMENT ON COLUMN public.culture_interview_sessions.last_activity_at IS 'Last activity timestamp - used to detect abandoned sessions';
COMMENT ON COLUMN public.culture_interview_sessions.connection_lost_at IS 'Timestamp when connection was detected as lost';
COMMENT ON COLUMN public.culture_interview_sessions.recovery_attempted IS 'Whether system attempted to recover data from partial transcript';