
CREATE TABLE IF NOT EXISTS public.ai_billing_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scanned_at timestamptz NOT NULL DEFAULT now(),
  window_days integer NOT NULL DEFAULT 7,
  total_rs_functions integer NOT NULL DEFAULT 0,
  ai_callers integer NOT NULL DEFAULT 0,
  billed integer NOT NULL DEFAULT 0,
  exempt integer NOT NULL DEFAULT 0,
  suspects jsonb NOT NULL DEFAULT '[]'::jsonb,
  scope_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_by text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_billing_audit_log_scanned_at
  ON public.ai_billing_audit_log (scanned_at DESC);

ALTER TABLE public.ai_billing_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view audit log"
  ON public.ai_billing_audit_log
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));
