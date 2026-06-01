-- Create project alerts table
CREATE TABLE IF NOT EXISTS public.project_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  status text NOT NULL DEFAULT 'active',
  title text NOT NULL,
  description text,
  dedupe_key text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  last_detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  dismissed_at timestamptz,
  dismissed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_alerts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Uniqueness for de-duplication per account
CREATE UNIQUE INDEX IF NOT EXISTS project_alerts_account_dedupe_key_uidx
  ON public.project_alerts (account_id, dedupe_key);

CREATE INDEX IF NOT EXISTS project_alerts_account_status_idx
  ON public.project_alerts (account_id, status);

CREATE INDEX IF NOT EXISTS project_alerts_status_severity_idx
  ON public.project_alerts (status, severity);

-- Simple validation (no CHECK constraints with now())
CREATE OR REPLACE FUNCTION public.project_alerts_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.severity NOT IN ('info','warning','critical') THEN
    RAISE EXCEPTION 'Invalid severity: %', NEW.severity;
  END IF;
  IF NEW.status NOT IN ('active','dismissed','resolved') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_alerts_validate ON public.project_alerts;
CREATE TRIGGER trg_project_alerts_validate
BEFORE INSERT OR UPDATE ON public.project_alerts
FOR EACH ROW EXECUTE FUNCTION public.project_alerts_validate();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_alerts_updated_at ON public.project_alerts;
CREATE TRIGGER trg_project_alerts_updated_at
BEFORE UPDATE ON public.project_alerts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.project_alerts ENABLE ROW LEVEL SECURITY;

-- Policies (account-based access)
DROP POLICY IF EXISTS "Project alerts are viewable by account members" ON public.project_alerts;
CREATE POLICY "Project alerts are viewable by account members"
ON public.project_alerts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = project_alerts.account_id
      AND am.user_id = auth.uid()
      AND COALESCE(am.is_active, true) = true
  )
);

DROP POLICY IF EXISTS "Project alerts are updatable by owners/admins" ON public.project_alerts;
CREATE POLICY "Project alerts are updatable by owners/admins"
ON public.project_alerts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = project_alerts.account_id
      AND am.user_id = auth.uid()
      AND COALESCE(am.is_active, true) = true
      AND am.role IN ('owner','admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = project_alerts.account_id
      AND am.user_id = auth.uid()
      AND COALESCE(am.is_active, true) = true
      AND am.role IN ('owner','admin')
  )
);

-- Disallow direct inserts/deletes from client (managed by backend job)
DROP POLICY IF EXISTS "No direct insert to project alerts" ON public.project_alerts;
CREATE POLICY "No direct insert to project alerts"
ON public.project_alerts
FOR INSERT
WITH CHECK (false);

DROP POLICY IF EXISTS "No direct delete to project alerts" ON public.project_alerts;
CREATE POLICY "No direct delete to project alerts"
ON public.project_alerts
FOR DELETE
USING (false);
