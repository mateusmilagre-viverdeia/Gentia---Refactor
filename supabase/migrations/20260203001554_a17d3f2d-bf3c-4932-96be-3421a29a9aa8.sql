-- Create ENUM types for meeting status, item type, and frequency
CREATE TYPE meeting_one_on_one_status AS ENUM ('draft', 'scheduled', 'completed', 'cancelled');
CREATE TYPE meeting_item_type AS ENUM ('topic', 'action', 'feedback', 'blocker');
CREATE TYPE meeting_recurrence_frequency AS ENUM ('weekly', 'biweekly', 'monthly');

-- Table: meeting_one_on_one_templates (create first as it's referenced)
CREATE TABLE public.meeting_one_on_one_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: meeting_one_on_one_recurrence
CREATE TABLE public.meeting_one_on_one_recurrence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL,
  collaborator_id UUID NOT NULL,
  frequency meeting_recurrence_frequency NOT NULL DEFAULT 'weekly',
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  preferred_time TIME,
  is_active BOOLEAN DEFAULT true,
  next_occurrence DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: meetings_one_on_one (main table)
CREATE TABLE public.meetings_one_on_one (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL,
  collaborator_id UUID NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status meeting_one_on_one_status NOT NULL DEFAULT 'scheduled',
  recurrence_id UUID REFERENCES public.meeting_one_on_one_recurrence(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.meeting_one_on_one_templates(id) ON DELETE SET NULL,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: meeting_one_on_one_items
CREATE TABLE public.meeting_one_on_one_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings_one_on_one(id) ON DELETE CASCADE,
  item_type meeting_item_type NOT NULL DEFAULT 'topic',
  content TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  due_date DATE,
  created_by UUID,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.meeting_one_on_one_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_one_on_one_recurrence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings_one_on_one ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_one_on_one_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates (global templates readable by all, account templates by members)
CREATE POLICY "Templates are viewable by account members or global" 
ON public.meeting_one_on_one_templates FOR SELECT 
USING (
  account_id IS NULL OR
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = meeting_one_on_one_templates.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
  )
);

CREATE POLICY "Account admins can manage templates" 
ON public.meeting_one_on_one_templates FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = meeting_one_on_one_templates.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
    AND am.role IN ('owner', 'admin')
  )
);

-- RLS Policies for recurrence
CREATE POLICY "Users can view their recurrences" 
ON public.meeting_one_on_one_recurrence FOR SELECT 
USING (
  manager_id = auth.uid() OR
  collaborator_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = meeting_one_on_one_recurrence.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
    AND am.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Managers can manage recurrences" 
ON public.meeting_one_on_one_recurrence FOR ALL 
USING (
  manager_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = meeting_one_on_one_recurrence.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
    AND am.role IN ('owner', 'admin')
  )
);

-- RLS Policies for meetings
CREATE POLICY "Users can view their meetings" 
ON public.meetings_one_on_one FOR SELECT 
USING (
  manager_id = auth.uid() OR
  collaborator_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = meetings_one_on_one.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
    AND am.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Managers can create meetings" 
ON public.meetings_one_on_one FOR INSERT 
WITH CHECK (
  manager_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = meetings_one_on_one.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
    AND am.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Managers can update meetings" 
ON public.meetings_one_on_one FOR UPDATE 
USING (
  manager_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = meetings_one_on_one.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
    AND am.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Managers can delete meetings" 
ON public.meetings_one_on_one FOR DELETE 
USING (
  manager_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = meetings_one_on_one.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
    AND am.role IN ('owner', 'admin')
  )
);

-- RLS Policies for meeting items
CREATE POLICY "Users can view items of their meetings" 
ON public.meeting_one_on_one_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.meetings_one_on_one m
    WHERE m.id = meeting_one_on_one_items.meeting_id
    AND (m.manager_id = auth.uid() OR m.collaborator_id = auth.uid())
  ) OR
  EXISTS (
    SELECT 1 FROM public.meetings_one_on_one m
    JOIN public.account_members am ON am.account_id = m.account_id
    WHERE m.id = meeting_one_on_one_items.meeting_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
    AND am.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Participants can manage items" 
ON public.meeting_one_on_one_items FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.meetings_one_on_one m
    WHERE m.id = meeting_one_on_one_items.meeting_id
    AND (m.manager_id = auth.uid() OR m.collaborator_id = auth.uid())
  )
);

-- Create indexes for performance
CREATE INDEX idx_meetings_one_on_one_account ON public.meetings_one_on_one(account_id);
CREATE INDEX idx_meetings_one_on_one_manager ON public.meetings_one_on_one(manager_id);
CREATE INDEX idx_meetings_one_on_one_collaborator ON public.meetings_one_on_one(collaborator_id);
CREATE INDEX idx_meetings_one_on_one_scheduled ON public.meetings_one_on_one(scheduled_at);
CREATE INDEX idx_meetings_one_on_one_status ON public.meetings_one_on_one(status);
CREATE INDEX idx_meeting_items_meeting ON public.meeting_one_on_one_items(meeting_id);
CREATE INDEX idx_meeting_recurrence_next ON public.meeting_one_on_one_recurrence(next_occurrence) WHERE is_active = true;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_meeting_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_meetings_one_on_one_updated_at
  BEFORE UPDATE ON public.meetings_one_on_one
  FOR EACH ROW EXECUTE FUNCTION public.update_meeting_updated_at();

CREATE TRIGGER update_meeting_items_updated_at
  BEFORE UPDATE ON public.meeting_one_on_one_items
  FOR EACH ROW EXECUTE FUNCTION public.update_meeting_updated_at();

CREATE TRIGGER update_meeting_recurrence_updated_at
  BEFORE UPDATE ON public.meeting_one_on_one_recurrence
  FOR EACH ROW EXECUTE FUNCTION public.update_meeting_updated_at();

CREATE TRIGGER update_meeting_templates_updated_at
  BEFORE UPDATE ON public.meeting_one_on_one_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_meeting_updated_at();

-- Insert default global templates
INSERT INTO public.meeting_one_on_one_templates (account_id, name, description, items, is_default) VALUES
(NULL, 'Check-in Semanal', 'Template para reuniões semanais de acompanhamento', 
 '[
   {"type": "topic", "content": "Como você está se sentindo esta semana?"},
   {"type": "topic", "content": "Quais foram suas principais conquistas?"},
   {"type": "topic", "content": "O que está te impedindo de avançar?"},
   {"type": "topic", "content": "Como posso te ajudar?"},
   {"type": "topic", "content": "Prioridades para a próxima semana"}
 ]'::jsonb, true),

(NULL, 'Feedback e Desenvolvimento', 'Template focado em feedback e desenvolvimento profissional',
 '[
   {"type": "feedback", "content": "Feedback sobre o último período"},
   {"type": "topic", "content": "Áreas de força identificadas"},
   {"type": "topic", "content": "Oportunidades de desenvolvimento"},
   {"type": "action", "content": "Metas de curto prazo"},
   {"type": "topic", "content": "Recursos necessários"}
 ]'::jsonb, false),

(NULL, 'Carreira e Crescimento', 'Template para discussões de carreira e plano de desenvolvimento',
 '[
   {"type": "topic", "content": "Onde você se vê em 6 meses/1 ano?"},
   {"type": "topic", "content": "Quais habilidades quer desenvolver?"},
   {"type": "topic", "content": "Que tipo de projetos te interessam?"},
   {"type": "topic", "content": "Como posso apoiar seu crescimento?"},
   {"type": "action", "content": "Próximos passos de desenvolvimento"}
 ]'::jsonb, false),

(NULL, 'Resolução de Problemas', 'Template para sessões focadas em resolver problemas específicos',
 '[
   {"type": "blocker", "content": "Qual é o problema principal?"},
   {"type": "topic", "content": "O que já foi tentado?"},
   {"type": "topic", "content": "Quais são as opções disponíveis?"},
   {"type": "action", "content": "Qual é o próximo passo?"},
   {"type": "topic", "content": "Como medir o sucesso?"}
 ]'::jsonb, false);