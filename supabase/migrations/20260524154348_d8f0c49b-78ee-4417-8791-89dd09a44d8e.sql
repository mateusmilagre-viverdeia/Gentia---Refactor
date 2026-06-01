
CREATE TABLE public.ai_billing_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  ai_calls_count INTEGER NOT NULL DEFAULT 0,
  estimated_cost_brl NUMERIC(10,4) NOT NULL DEFAULT 0,
  credits_adjusted NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'detected'
    CHECK (status IN ('detected','auto_corrected','requires_manual_review','notified','dismissed')),
  correction_reference_id UUID,
  notified_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_billing_incidents_account ON public.ai_billing_incidents(account_id);
CREATE INDEX idx_ai_billing_incidents_status ON public.ai_billing_incidents(status);
CREATE INDEX idx_ai_billing_incidents_detected_at ON public.ai_billing_incidents(detected_at DESC);
CREATE INDEX idx_ai_billing_incidents_function ON public.ai_billing_incidents(function_name);

ALTER TABLE public.ai_billing_incidents ENABLE ROW LEVEL SECURITY;

-- Super admin vê tudo
CREATE POLICY "Super admins can view all billing incidents"
ON public.ai_billing_incidents FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Admins da conta veem incidentes da própria conta
CREATE POLICY "Account members can view own account incidents"
ON public.ai_billing_incidents FOR SELECT
TO authenticated
USING (account_id IS NOT NULL AND public.is_account_member(auth.uid(), account_id));

-- Super admin pode atualizar (dismiss, notes etc.)
CREATE POLICY "Super admins can update billing incidents"
ON public.ai_billing_incidents FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER trg_ai_billing_incidents_updated_at
BEFORE UPDATE ON public.ai_billing_incidents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
