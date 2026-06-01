-- =========================================
-- FASE 1: Pulse 100% Customizável via Frontend
-- =========================================

-- 1.1 Criar tabela pulse_culture_questions (se não existir)
CREATE TABLE IF NOT EXISTS public.pulse_culture_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  pillar_type text NOT NULL,
  reference_text text,
  question_text text NOT NULL,
  is_active boolean DEFAULT true,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS para pulse_culture_questions
ALTER TABLE public.pulse_culture_questions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view culture questions for their account"
    ON public.pulse_culture_questions FOR SELECT
    USING (is_account_member(auth.uid(), account_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can manage culture questions for their account"
    ON public.pulse_culture_questions FOR ALL
    USING (is_account_member(auth.uid(), account_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1.2 Adicionar colunas na pulse_daily_assignment_items
ALTER TABLE public.pulse_daily_assignment_items
ADD COLUMN IF NOT EXISTS is_culture_question boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS culture_pillar text,
ADD COLUMN IF NOT EXISTS culture_question_id uuid;

-- Tornar question_id nullable (perguntas de cultura usam culture_question_id)
ALTER TABLE public.pulse_daily_assignment_items
ALTER COLUMN question_id DROP NOT NULL;

-- Adicionar FK para culture_question_id
DO $$ BEGIN
  ALTER TABLE public.pulse_daily_assignment_items
    ADD CONSTRAINT fk_culture_question
    FOREIGN KEY (culture_question_id) REFERENCES public.pulse_culture_questions(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1.3 Adicionar colunas de agendamento customizável na pulse_schedule_rules
ALTER TABLE public.pulse_schedule_rules
ADD COLUMN IF NOT EXISTS send_time time DEFAULT '08:59'::time,
ADD COLUMN IF NOT EXISTS send_days integer[] DEFAULT '{1,2,3,4,5}'::integer[],
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date;

-- Comentários explicativos
COMMENT ON COLUMN public.pulse_schedule_rules.send_time IS 'Horário local de envio do pulse (HH:MM)';
COMMENT ON COLUMN public.pulse_schedule_rules.send_days IS 'Dias da semana para envio (0=Dom, 1=Seg, ..., 6=Sab)';
COMMENT ON COLUMN public.pulse_schedule_rules.is_recurring IS 'Se o pulse repete automaticamente nos dias configurados';
COMMENT ON COLUMN public.pulse_schedule_rules.start_date IS 'Data de início (opcional)';
COMMENT ON COLUMN public.pulse_schedule_rules.end_date IS 'Data de término (opcional)';

-- 1.4 Criar tabela para canais de notificação customizáveis
CREATE TABLE IF NOT EXISTS public.pulse_notification_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel_type text NOT NULL CHECK (channel_type IN ('discord', 'slack', 'email', 'webhook')),
  name text NOT NULL,
  webhook_url text,
  is_active boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS para pulse_notification_channels
ALTER TABLE public.pulse_notification_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view notification channels"
  ON public.pulse_notification_channels FOR SELECT
  USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Account admins can manage notification channels"
  ON public.pulse_notification_channels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members
      WHERE account_members.account_id = pulse_notification_channels.account_id
        AND account_members.user_id = auth.uid()
        AND account_members.role IN ('owner', 'admin')
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pulse_notification_channels_account 
  ON public.pulse_notification_channels(account_id);
CREATE INDEX IF NOT EXISTS idx_pulse_notification_channels_active 
  ON public.pulse_notification_channels(account_id, is_active);

-- Comentários
COMMENT ON TABLE public.pulse_notification_channels IS 'Canais de notificação configurados por cada empresa para o Pulse';
COMMENT ON COLUMN public.pulse_notification_channels.channel_type IS 'Tipo: discord, slack, email, webhook';
COMMENT ON COLUMN public.pulse_notification_channels.config IS 'Configuração específica por tipo (headers, templates, etc)';