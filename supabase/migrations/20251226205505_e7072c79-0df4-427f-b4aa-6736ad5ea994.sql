-- Create pulse_surveys table for managing Pulse survey configurations
CREATE TABLE public.pulse_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed')),
  
  -- Configuração de Drivers (Passo 1)
  selected_driver_keys TEXT[] NOT NULL DEFAULT '{}',
  
  -- Configuração de Equipes (Passo 2)
  selected_team_ids UUID[] DEFAULT '{}',
  all_teams BOOLEAN DEFAULT false,
  
  -- Configuração de Frequência (Passo 3)
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  send_time TIME DEFAULT '09:00',
  send_days INTEGER[] DEFAULT '{1,2,3,4,5}',
  start_date DATE,
  end_date DATE,
  
  -- Regras de Envio (Passo 4)
  questions_per_day INTEGER DEFAULT 3 CHECK (questions_per_day >= 1 AND questions_per_day <= 10),
  block_repeat_days INTEGER DEFAULT 7 CHECK (block_repeat_days >= 0 AND block_repeat_days <= 30),
  
  -- Perguntas Selecionadas (Passo 5)
  selected_question_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.pulse_surveys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view pulse surveys for their account"
ON public.pulse_surveys FOR SELECT
USING (is_account_member(auth.uid(), account_id) OR is_pulse_admin(auth.uid(), account_id));

CREATE POLICY "Pulse admins can insert pulse surveys"
ON public.pulse_surveys FOR INSERT
WITH CHECK (is_pulse_admin(auth.uid(), account_id));

CREATE POLICY "Pulse admins can update pulse surveys"
ON public.pulse_surveys FOR UPDATE
USING (is_pulse_admin(auth.uid(), account_id));

CREATE POLICY "Pulse admins can delete pulse surveys"
ON public.pulse_surveys FOR DELETE
USING (is_pulse_admin(auth.uid(), account_id));

-- Trigger for updated_at
CREATE TRIGGER update_pulse_surveys_updated_at
BEFORE UPDATE ON public.pulse_surveys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_pulse_surveys_account_id ON public.pulse_surveys(account_id);
CREATE INDEX idx_pulse_surveys_status ON public.pulse_surveys(status);