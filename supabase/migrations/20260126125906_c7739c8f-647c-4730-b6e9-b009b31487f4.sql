-- Fase 2: Tabela de Credenciais de Distribuição
-- Armazena credenciais OAuth/API por empresa para integrações premium

CREATE TABLE public.job_distribution_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  credential_type TEXT NOT NULL DEFAULT 'oauth2',
  
  -- Credenciais (sensíveis - armazenadas com cuidado)
  client_id TEXT,
  client_secret_encrypted TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Metadata
  scopes TEXT[],
  organization_id TEXT,
  webhook_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending',
  last_validated_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  
  UNIQUE(account_id, channel_name)
);

-- Índices para performance
CREATE INDEX idx_distribution_credentials_account ON public.job_distribution_credentials(account_id);
CREATE INDEX idx_distribution_credentials_status ON public.job_distribution_credentials(status);

-- Habilitar RLS
ALTER TABLE public.job_distribution_credentials ENABLE ROW LEVEL SECURITY;

-- Política restritiva - apenas owners e admins podem gerenciar credenciais
CREATE POLICY "Only admins can view credentials"
  ON public.job_distribution_credentials FOR SELECT
  USING (account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true 
    AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Only admins can insert credentials"
  ON public.job_distribution_credentials FOR INSERT
  WITH CHECK (account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true 
    AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Only admins can update credentials"
  ON public.job_distribution_credentials FOR UPDATE
  USING (account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true 
    AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Only admins can delete credentials"
  ON public.job_distribution_credentials FOR DELETE
  USING (account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true 
    AND role IN ('owner', 'admin')
  ));

-- Adicionar coluna de referência na tabela de canais
ALTER TABLE public.job_distribution_channels
ADD COLUMN credentials_id UUID REFERENCES public.job_distribution_credentials(id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_job_distribution_credentials_updated_at
  BEFORE UPDATE ON public.job_distribution_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();