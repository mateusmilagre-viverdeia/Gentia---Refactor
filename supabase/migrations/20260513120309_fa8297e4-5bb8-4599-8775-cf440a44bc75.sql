
ALTER TABLE public.culture_interview_sessions
  ADD COLUMN IF NOT EXISTS reused_from_session_id uuid NULL REFERENCES public.culture_interview_sessions(id) ON DELETE SET NULL;

ALTER TABLE public.candidate_disc_sessions
  ADD COLUMN IF NOT EXISTS reused_from_session_id uuid NULL REFERENCES public.candidate_disc_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_culture_sessions_reused_from ON public.culture_interview_sessions(reused_from_session_id) WHERE reused_from_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disc_sessions_reused_from ON public.candidate_disc_sessions(reused_from_session_id) WHERE reused_from_session_id IS NOT NULL;
