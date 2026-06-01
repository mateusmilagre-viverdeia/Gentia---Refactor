-- Phase 2: Unified recruitment communications log (DISC + others)

CREATE TABLE IF NOT EXISTS public.recruitment_communications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  job_id uuid NULL,
  candidate_id uuid NULL,
  application_id uuid NULL,
  session_id uuid NULL,

  message_type text NOT NULL,
  channel text NOT NULL,

  recipient text NOT NULL,
  subject text NULL,
  body text NULL,

  status text NOT NULL DEFAULT 'queued',
  provider text NULL,
  provider_message_id text NULL,

  error_code text NULL,
  error_message text NULL,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Foreign keys (best-effort, only where tables exist)
ALTER TABLE public.recruitment_communications_log
  ADD CONSTRAINT recruitment_communications_log_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES public.companies(id)
  ON DELETE CASCADE;

ALTER TABLE public.recruitment_communications_log
  ADD CONSTRAINT recruitment_communications_log_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.recruitment_jobs(id)
  ON DELETE SET NULL;

ALTER TABLE public.recruitment_communications_log
  ADD CONSTRAINT recruitment_communications_log_candidate_id_fkey
  FOREIGN KEY (candidate_id) REFERENCES public.recruitment_candidates(id)
  ON DELETE SET NULL;

ALTER TABLE public.recruitment_communications_log
  ADD CONSTRAINT recruitment_communications_log_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES public.recruitment_applications(id)
  ON DELETE SET NULL;

ALTER TABLE public.recruitment_communications_log
  ADD CONSTRAINT recruitment_communications_log_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.candidate_disc_sessions(id)
  ON DELETE SET NULL;

-- Basic indexes for filtering/audit
CREATE INDEX IF NOT EXISTS idx_recruitment_comm_log_account_created
  ON public.recruitment_communications_log (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recruitment_comm_log_candidate_job_type_created
  ON public.recruitment_communications_log (account_id, candidate_id, job_id, message_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recruitment_comm_log_type_channel_status_created
  ON public.recruitment_communications_log (account_id, message_type, channel, status, created_at DESC);

-- Data hygiene: constrain known values (lightweight, no immutable checks)
-- (Optional: keep as plain text to avoid migrations failing if you extend values later.)

-- RLS
ALTER TABLE public.recruitment_communications_log ENABLE ROW LEVEL SECURITY;

-- Members can view logs for their account
DROP POLICY IF EXISTS "Members can view recruitment communications logs" ON public.recruitment_communications_log;
CREATE POLICY "Members can view recruitment communications logs"
ON public.recruitment_communications_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.account_members am
    WHERE am.account_id = recruitment_communications_log.account_id
      AND am.user_id = auth.uid()
      AND COALESCE(am.is_active, true) = true
  )
);

-- Members can insert logs for their account (needed because backend functions use the caller JWT)
DROP POLICY IF EXISTS "Members can insert recruitment communications logs" ON public.recruitment_communications_log;
CREATE POLICY "Members can insert recruitment communications logs"
ON public.recruitment_communications_log
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.account_members am
    WHERE am.account_id = recruitment_communications_log.account_id
      AND am.user_id = auth.uid()
      AND COALESCE(am.is_active, true) = true
  )
);

-- No update/delete policies (immutable audit trail)