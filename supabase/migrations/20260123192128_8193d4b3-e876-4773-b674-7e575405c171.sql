-- Create recruitment communication alerts table (in-app alerts)
CREATE TABLE IF NOT EXISTS public.recruitment_communication_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_id text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  stats_snapshot jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  resolved_by uuid NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recruitment_comm_alerts_account_created
  ON public.recruitment_communication_alerts (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recruitment_comm_alerts_account_resolved
  ON public.recruitment_communication_alerts (account_id, resolved_at);

CREATE INDEX IF NOT EXISTS idx_recruitment_comm_alerts_rule_created
  ON public.recruitment_communication_alerts (rule_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.recruitment_communication_alerts ENABLE ROW LEVEL SECURITY;

-- Policies: only account admins (incl. admin_rh) can read/resolve
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'recruitment_communication_alerts'
      AND policyname = 'Admins can view recruitment communication alerts'
  ) THEN
    CREATE POLICY "Admins can view recruitment communication alerts"
    ON public.recruitment_communication_alerts
    FOR SELECT
    USING (public.is_account_admin_or_owner(auth.uid(), account_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'recruitment_communication_alerts'
      AND policyname = 'Admins can resolve recruitment communication alerts'
  ) THEN
    CREATE POLICY "Admins can resolve recruitment communication alerts"
    ON public.recruitment_communication_alerts
    FOR UPDATE
    USING (public.is_account_admin_or_owner(auth.uid(), account_id))
    WITH CHECK (public.is_account_admin_or_owner(auth.uid(), account_id));
  END IF;
END $$;

-- Updated_at trigger (reuse existing trigger function if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'update_updated_at_column'
      AND pg_function_is_visible(oid)
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'update_recruitment_communication_alerts_updated_at'
    ) THEN
      CREATE TRIGGER update_recruitment_communication_alerts_updated_at
      BEFORE UPDATE ON public.recruitment_communication_alerts
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
  END IF;
END $$;