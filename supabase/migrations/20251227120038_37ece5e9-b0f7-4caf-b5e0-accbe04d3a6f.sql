-- Tabela para rastrear notificações de billing enviadas
CREATE TABLE public.billing_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('grace_warning_7', 'grace_warning_3', 'grace_warning_1', 'blocked', 'grant_expiring_7')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email_to TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para consultas eficientes (sem função DATE)
CREATE INDEX idx_billing_notifications_org_type ON public.billing_notifications(org_id, notification_type);
CREATE INDEX idx_billing_notifications_sent_at ON public.billing_notifications(sent_at DESC);

-- RLS
ALTER TABLE public.billing_notifications ENABLE ROW LEVEL SECURITY;

-- Apenas super_admin pode ver notificações
CREATE POLICY "Super admins can view billing notifications"
ON public.billing_notifications
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Service role pode inserir (usado pela edge function)
CREATE POLICY "Service role can insert billing notifications"
ON public.billing_notifications
FOR INSERT
WITH CHECK (true);

-- Comentário na tabela
COMMENT ON TABLE public.billing_notifications IS 'Rastreia emails de notificação de billing enviados para evitar duplicatas';