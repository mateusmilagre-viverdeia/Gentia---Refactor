-- Phase 4: Proactive Project Alerts

CREATE TABLE IF NOT EXISTS public.project_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  status text NOT NULL DEFAULT 'active',
  title text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text NOT NULL,
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  last_detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  dismissed_at timestamptz,
  dismissed_by uuid,
  email_last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Basic constraints
DO $$ BEGIN
  ALTER TABLE public.project_alerts
    ADD CONSTRAINT project_alerts_status_check
    CHECK (status IN ('active','resolved','dismissed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.project_alerts
    ADD CONSTRAINT project_alerts_severity_check
    CHECK (severity IN ('info','warning','critical'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ensure deduplication per account
DO $$ BEGIN
  CREATE UNIQUE INDEX project_alerts_account_dedupe_key_idx
    ON public.project_alerts(account_id, dedupe_key);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX project_alerts_account_status_idx
    ON public.project_alerts(account_id, status, severity);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- updated_at trigger (reuse existing function if present)
DO $$ BEGIN
  CREATE TRIGGER update_project_alerts_updated_at
  BEFORE UPDATE ON public.project_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS
ALTER TABLE public.project_alerts ENABLE ROW LEVEL SECURITY;

-- Select: account members and delegated consultants
DO $$ BEGIN
  CREATE POLICY "Project alerts are viewable by account" 
  ON public.project_alerts
  FOR SELECT
  USING (
    public.is_account_member(auth.uid(), account_id)
    OR public.can_edit_client_project(auth.uid(), account_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Insert: only delegated editors (alerts normally inserted by backend service role)
DO $$ BEGIN
  CREATE POLICY "Project alerts insert by editors"
  ON public.project_alerts
  FOR INSERT
  WITH CHECK (
    public.can_edit_client_project(auth.uid(), account_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Update: allow dismiss/resolve by delegated editors
DO $$ BEGIN
  CREATE POLICY "Project alerts update by editors"
  ON public.project_alerts
  FOR UPDATE
  USING (
    public.can_edit_client_project(auth.uid(), account_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Delete: delegated editors only
DO $$ BEGIN
  CREATE POLICY "Project alerts delete by editors"
  ON public.project_alerts
  FOR DELETE
  USING (
    public.can_edit_client_project(auth.uid(), account_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;