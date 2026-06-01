-- Tabela de canais de distribuição configurados por empresa
CREATE TABLE public.job_distribution_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  channel_type TEXT NOT NULL DEFAULT 'xml_feed',
  is_enabled BOOLEAN DEFAULT true,
  feed_registered_at TIMESTAMPTZ,
  external_id TEXT,
  last_sync_at TIMESTAMPTZ,
  stats JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, channel_name)
);

-- Tabela de logs de distribuição por vaga
CREATE TABLE public.job_distribution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  distributed_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, channel_name)
);

-- Índices para performance
CREATE INDEX idx_distribution_channels_account ON public.job_distribution_channels(account_id);
CREATE INDEX idx_distribution_logs_job ON public.job_distribution_logs(job_id);
CREATE INDEX idx_distribution_logs_status ON public.job_distribution_logs(status);

-- Habilitar RLS
ALTER TABLE public.job_distribution_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_distribution_logs ENABLE ROW LEVEL SECURITY;

-- Policies para job_distribution_channels
CREATE POLICY "Members can view their org channels"
  ON public.job_distribution_channels FOR SELECT
  USING (account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Admins can insert channels"
  ON public.job_distribution_channels FOR INSERT
  WITH CHECK (account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true 
    AND role IN ('owner', 'admin', 'admin_rh')
  ));

CREATE POLICY "Admins can update channels"
  ON public.job_distribution_channels FOR UPDATE
  USING (account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true 
    AND role IN ('owner', 'admin', 'admin_rh')
  ));

CREATE POLICY "Admins can delete channels"
  ON public.job_distribution_channels FOR DELETE
  USING (account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true 
    AND role IN ('owner', 'admin', 'admin_rh')
  ));

-- Policies para job_distribution_logs
CREATE POLICY "Members can view their job logs"
  ON public.job_distribution_logs FOR SELECT
  USING (job_id IN (
    SELECT id FROM public.recruitment_jobs WHERE account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  ));

CREATE POLICY "Admins can insert job logs"
  ON public.job_distribution_logs FOR INSERT
  WITH CHECK (job_id IN (
    SELECT id FROM public.recruitment_jobs WHERE account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true 
      AND role IN ('owner', 'admin', 'admin_rh')
    )
  ));

CREATE POLICY "Admins can update job logs"
  ON public.job_distribution_logs FOR UPDATE
  USING (job_id IN (
    SELECT id FROM public.recruitment_jobs WHERE account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true 
      AND role IN ('owner', 'admin', 'admin_rh')
    )
  ));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_job_distribution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_distribution_channels_updated_at
  BEFORE UPDATE ON public.job_distribution_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_job_distribution_updated_at();

CREATE TRIGGER update_job_distribution_logs_updated_at
  BEFORE UPDATE ON public.job_distribution_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_job_distribution_updated_at();