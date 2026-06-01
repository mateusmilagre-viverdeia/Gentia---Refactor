
ALTER TABLE public.org_auto_recharge_settings
  ADD COLUMN IF NOT EXISTS last_recharge_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_recharge_status text,
  ADD COLUMN IF NOT EXISTS last_recharge_reason text,
  ADD COLUMN IF NOT EXISTS last_recharge_invoice_id text,
  ADD COLUMN IF NOT EXISTS recharge_in_progress boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recharge_lock_until timestamptz;

CREATE TABLE IF NOT EXISTS public.recruitment_auto_recharge_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  triggered_by text,
  status text NOT NULL,
  reason text,
  invoice_id text,
  credits_added numeric,
  amount_charged numeric,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_recharge_attempts_org_created
  ON public.recruitment_auto_recharge_attempts (org_id, created_at DESC);

ALTER TABLE public.recruitment_auto_recharge_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_admins_read_recharge_attempts" ON public.recruitment_auto_recharge_attempts;
CREATE POLICY "org_admins_read_recharge_attempts"
  ON public.recruitment_auto_recharge_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM account_members am
      WHERE am.account_id = recruitment_auto_recharge_attempts.org_id
        AND am.user_id = auth.uid()
        AND am.is_active = true
        AND am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])
    )
  );
