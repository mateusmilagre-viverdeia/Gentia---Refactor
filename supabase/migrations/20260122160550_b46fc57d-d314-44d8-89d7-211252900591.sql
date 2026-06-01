-- Log de entregas de notificações do Pulse
CREATE TABLE IF NOT EXISTS public.pulse_notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  channel_id uuid NULL,
  channel_type text NOT NULL,
  channel_name text NULL,
  event text NOT NULL,
  status text NOT NULL,
  http_status integer NULL,
  duration_ms integer NULL,
  error_message text NULL,
  response_body text NULL,
  payload jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Relacionamentos
ALTER TABLE public.pulse_notification_deliveries
  ADD CONSTRAINT pulse_notification_deliveries_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES public.companies(id)
  ON DELETE CASCADE;

ALTER TABLE public.pulse_notification_deliveries
  ADD CONSTRAINT pulse_notification_deliveries_channel_id_fkey
  FOREIGN KEY (channel_id) REFERENCES public.pulse_notification_channels(id)
  ON DELETE SET NULL;

-- Índices para métricas e listagens
CREATE INDEX IF NOT EXISTS idx_pulse_notification_deliveries_account_created_at
  ON public.pulse_notification_deliveries (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pulse_notification_deliveries_channel_created_at
  ON public.pulse_notification_deliveries (channel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pulse_notification_deliveries_account_status_created_at
  ON public.pulse_notification_deliveries (account_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pulse_notification_deliveries_account_event_created_at
  ON public.pulse_notification_deliveries (account_id, event, created_at DESC);

-- RLS
ALTER TABLE public.pulse_notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Visibilidade: Owner + Admin RH
CREATE POLICY "Owners and RH admins can view pulse notification deliveries"
ON public.pulse_notification_deliveries
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.account_members am
    WHERE am.account_id = pulse_notification_deliveries.account_id
      AND am.user_id = auth.uid()
      AND COALESCE(am.is_active, true) = true
      AND am.role IN ('owner'::public.account_role, 'admin_rh'::public.account_role)
  )
);

-- Não criamos políticas de INSERT/UPDATE/DELETE (logs serão escritos pelo backend com chave de serviço).