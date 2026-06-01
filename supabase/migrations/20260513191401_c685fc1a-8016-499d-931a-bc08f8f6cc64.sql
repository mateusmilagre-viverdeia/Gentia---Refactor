-- 1) Soft-archive columns
ALTER TABLE public.culture_interview_sessions ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.candidate_disc_sessions ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.technical_interview_sessions ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_culture_sessions_archived_at ON public.culture_interview_sessions(archived_at);
CREATE INDEX IF NOT EXISTS idx_disc_sessions_archived_at ON public.candidate_disc_sessions(archived_at);
CREATE INDEX IF NOT EXISTS idx_tech_sessions_archived_at ON public.technical_interview_sessions(archived_at);

-- 2) voice_interview_events
CREATE TABLE IF NOT EXISTS public.voice_interview_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  session_id uuid NOT NULL,
  session_type text NOT NULL CHECK (session_type IN ('cultural','technical','disc')),
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_ts timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vie_session ON public.voice_interview_events(session_id, client_ts);
CREATE INDEX IF NOT EXISTS idx_vie_account_type ON public.voice_interview_events(account_id, event_type, created_at DESC);

ALTER TABLE public.voice_interview_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view voice events"
  ON public.voice_interview_events FOR SELECT
  USING (public.is_account_member(auth.uid(), account_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Service role can insert voice events"
  ON public.voice_interview_events FOR INSERT
  WITH CHECK (true);

-- 3) voice_interview_anomalies
CREATE TABLE IF NOT EXISTS public.voice_interview_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  session_id uuid NOT NULL,
  session_type text NOT NULL CHECK (session_type IN ('cultural','technical','disc')),
  candidate_id uuid,
  candidate_profile_id uuid,
  job_id uuid,
  agent_id uuid,
  severity text NOT NULL CHECK (severity IN ('info','warning','critical')),
  rule_code text NOT NULL,
  description text NOT NULL,
  suggestion text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_classification text,
  ai_reasoning text,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, rule_code)
);

CREATE INDEX IF NOT EXISTS idx_via_account_created ON public.voice_interview_anomalies(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_via_severity ON public.voice_interview_anomalies(severity, resolved_at);
CREATE INDEX IF NOT EXISTS idx_via_session ON public.voice_interview_anomalies(session_id);

ALTER TABLE public.voice_interview_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view their anomalies"
  ON public.voice_interview_anomalies FOR SELECT
  USING (public.is_account_member(auth.uid(), account_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Account admins can update anomalies"
  ON public.voice_interview_anomalies FOR UPDATE
  USING (public.is_account_member(auth.uid(), account_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Service role can insert anomalies"
  ON public.voice_interview_anomalies FOR INSERT
  WITH CHECK (true);