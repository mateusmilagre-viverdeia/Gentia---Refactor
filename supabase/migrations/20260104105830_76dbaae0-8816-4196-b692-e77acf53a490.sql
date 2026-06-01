-- Fase 1: Alterações no Banco de Dados para Billing Webhook-First

-- 1.1 Criar tabela billing_invoices para registrar faturas
CREATE TABLE public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  amount_due INTEGER NOT NULL DEFAULT 0,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'brl',
  status TEXT NOT NULL DEFAULT 'pending',
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  description TEXT,
  related_invite_id UUID REFERENCES public.account_invites(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.2 Adicionar colunas em account_invites para controle de pagamento
ALTER TABLE public.account_invites 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS token TEXT DEFAULT encode(gen_random_bytes(32), 'hex');

-- Adicionar constraint de check para status válidos
ALTER TABLE public.account_invites 
ADD CONSTRAINT account_invites_status_check 
CHECK (status IN ('awaiting_payment', 'paid_ready_to_send', 'sent', 'accepted', 'expired', 'pending', 'cancelled'));

-- 1.3 Adicionar coluna paid_seats em org_seats
ALTER TABLE public.org_seats 
ADD COLUMN IF NOT EXISTS paid_seats INTEGER DEFAULT 0;

-- 1.4 Habilitar RLS para billing_invoices
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Membros podem visualizar faturas da sua organização
CREATE POLICY "Members can view org invoices" ON public.billing_invoices
  FOR SELECT 
  TO authenticated
  USING (
    org_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Service role pode gerenciar faturas (webhooks)
CREATE POLICY "Service role can manage invoices" ON public.billing_invoices
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 1.5 Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_billing_invoices_org_id ON public.billing_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_stripe_invoice_id ON public.billing_invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON public.billing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_account_invites_status ON public.account_invites(status);
CREATE INDEX IF NOT EXISTS idx_account_invites_token ON public.account_invites(token);

-- 1.6 Trigger para atualizar updated_at em billing_invoices
CREATE TRIGGER update_billing_invoices_updated_at
  BEFORE UPDATE ON public.billing_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();