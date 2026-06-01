
-- Tabela de configuração global de email da plataforma
CREATE TABLE IF NOT EXISTS public.platform_email_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_name TEXT NOT NULL DEFAULT 'Gentia',
  from_email TEXT NOT NULL DEFAULT 'noreply@gentia.com.br',
  reply_to TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) NULL
);

-- Inserir registro padrão
INSERT INTO public.platform_email_config (from_name, from_email)
VALUES ('Gentia', 'noreply@gentia.com.br')
ON CONFLICT DO NOTHING;

-- RLS para platform_email_config
ALTER TABLE public.platform_email_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_select_email_config"
  ON public.platform_email_config FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_insert_email_config"
  ON public.platform_email_config FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_update_email_config"
  ON public.platform_email_config FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_platform_email_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER platform_email_config_updated_at
  BEFORE UPDATE ON public.platform_email_config
  FOR EACH ROW EXECUTE FUNCTION public.update_platform_email_config_updated_at();

-- Tabela de configuração global de WhatsApp da plataforma
CREATE TABLE IF NOT EXISTS public.platform_whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id TEXT NOT NULL DEFAULT '',
  waba_id TEXT NULL,
  access_token TEXT NOT NULL DEFAULT '',
  webhook_verify_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  is_active BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) NULL
);

-- Inserir registro padrão
INSERT INTO public.platform_whatsapp_config (phone_number_id, access_token)
VALUES ('', '')
ON CONFLICT DO NOTHING;

-- RLS para platform_whatsapp_config
ALTER TABLE public.platform_whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_select_whatsapp_config"
  ON public.platform_whatsapp_config FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_insert_whatsapp_config"
  ON public.platform_whatsapp_config FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_update_whatsapp_config"
  ON public.platform_whatsapp_config FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_platform_whatsapp_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER platform_whatsapp_config_updated_at
  BEFORE UPDATE ON public.platform_whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION public.update_platform_whatsapp_config_updated_at();
