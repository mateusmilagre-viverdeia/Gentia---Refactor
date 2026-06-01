-- Create impersonation logs table for auditing
CREATE TABLE public.impersonation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  impersonated_user_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.impersonation_logs ENABLE ROW LEVEL SECURITY;

-- Only owners can view their own impersonation logs
CREATE POLICY "Owner can view own impersonation logs"
ON public.impersonation_logs FOR SELECT TO authenticated
USING (owner_id = auth.uid());

-- Only owners can insert impersonation logs
CREATE POLICY "Owner can insert impersonation logs"
ON public.impersonation_logs FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Only owners can update their own logs (to set ended_at)
CREATE POLICY "Owner can update own impersonation logs"
ON public.impersonation_logs FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_impersonation_logs_owner ON public.impersonation_logs(owner_id);
CREATE INDEX idx_impersonation_logs_account ON public.impersonation_logs(account_id);