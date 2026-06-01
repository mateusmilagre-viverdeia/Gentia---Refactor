-- =====================================================
-- FASE 5: PROJECT PLAYBOOKS
-- Templates padronizados para projetos de consultoria
-- =====================================================

-- Table: project_playbooks (Template principal)
CREATE TABLE public.project_playbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'implementation', -- implementation, optimization, rescue, custom
  estimated_duration_weeks INTEGER NOT NULL DEFAULT 12,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  icon TEXT DEFAULT 'book-open',
  color TEXT DEFAULT '#3B82F6',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: playbook_phases (Fases do playbook)
CREATE TABLE public.playbook_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playbook_id UUID NOT NULL REFERENCES public.project_playbooks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  duration_weeks INTEGER NOT NULL DEFAULT 2,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: playbook_milestones (Milestones pré-definidos de cada fase)
CREATE TABLE public.playbook_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES public.playbook_phases(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  milestone_type TEXT NOT NULL DEFAULT 'checkpoint', -- pillar, checkpoint, custom, phase
  pillar TEXT, -- mission, vision, values, indicators, projects, energy, development, decision
  description TEXT,
  relative_start_days INTEGER NOT NULL DEFAULT 0, -- Dias após início da fase
  duration_days INTEGER NOT NULL DEFAULT 7,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: playbook_checklist_items (Itens de checklist para cada milestone)
CREATE TABLE public.playbook_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_id UUID NOT NULL REFERENCES public.playbook_milestones(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: playbook_guides (Guias de execução)
CREATE TABLE public.playbook_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playbook_id UUID NOT NULL REFERENCES public.project_playbooks(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.playbook_phases(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.playbook_milestones(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown content
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: project_playbook_applications (Rastrear qual playbook foi aplicado a cada projeto)
CREATE TABLE public.project_playbook_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  playbook_id UUID NOT NULL REFERENCES public.project_playbooks(id) ON DELETE RESTRICT,
  applied_by UUID REFERENCES auth.users(id),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  start_date DATE NOT NULL,
  notes TEXT,
  UNIQUE(account_id) -- Apenas um playbook por projeto
);

-- Add playbook tracking to project_milestones
ALTER TABLE public.project_milestones 
ADD COLUMN IF NOT EXISTS playbook_milestone_id UUID REFERENCES public.playbook_milestones(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS checklist_progress JSONB DEFAULT '[]'::jsonb;

-- Indexes for performance
CREATE INDEX idx_playbook_phases_playbook ON public.playbook_phases(playbook_id);
CREATE INDEX idx_playbook_milestones_phase ON public.playbook_milestones(phase_id);
CREATE INDEX idx_playbook_checklist_milestone ON public.playbook_checklist_items(milestone_id);
CREATE INDEX idx_playbook_guides_playbook ON public.playbook_guides(playbook_id);
CREATE INDEX idx_project_playbook_apps_account ON public.project_playbook_applications(account_id);
CREATE INDEX idx_project_milestones_playbook ON public.project_milestones(playbook_milestone_id);

-- Enable RLS
ALTER TABLE public.project_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_playbook_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_playbooks
-- Read: EP consultants and super_admin can view active playbooks
CREATE POLICY "EP team can view active playbooks"
ON public.project_playbooks FOR SELECT
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.ep_consultants ec 
    WHERE ec.user_id = auth.uid() AND ec.active = true
  )
);

CREATE POLICY "Super admin can view all playbooks"
ON public.project_playbooks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ep_consultants ec 
    WHERE ec.user_id = auth.uid() AND ec.active = true
  )
);

-- Write: Only super_admin and head_cs can manage playbooks
CREATE POLICY "EP admins can manage playbooks"
ON public.project_playbooks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.ep_consultants ec 
    WHERE ec.user_id = auth.uid() 
    AND ec.active = true
  )
);

-- RLS for playbook_phases (inherits from playbook access)
CREATE POLICY "View phases of accessible playbooks"
ON public.playbook_phases FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_playbooks pb
    JOIN public.ep_consultants ec ON ec.user_id = auth.uid() AND ec.active = true
    WHERE pb.id = playbook_id AND pb.is_active = true
  )
);

CREATE POLICY "Manage phases for admins"
ON public.playbook_phases FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.ep_consultants ec 
    WHERE ec.user_id = auth.uid() AND ec.active = true
  )
);

-- RLS for playbook_milestones
CREATE POLICY "View milestones of accessible playbooks"
ON public.playbook_milestones FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.playbook_phases pp
    JOIN public.project_playbooks pb ON pb.id = pp.playbook_id
    JOIN public.ep_consultants ec ON ec.user_id = auth.uid() AND ec.active = true
    WHERE pp.id = phase_id AND pb.is_active = true
  )
);

CREATE POLICY "Manage milestones for admins"
ON public.playbook_milestones FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.ep_consultants ec 
    WHERE ec.user_id = auth.uid() AND ec.active = true
  )
);

-- RLS for playbook_checklist_items
CREATE POLICY "View checklist items of accessible playbooks"
ON public.playbook_checklist_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.playbook_milestones pm
    JOIN public.playbook_phases pp ON pp.id = pm.phase_id
    JOIN public.project_playbooks pb ON pb.id = pp.playbook_id
    JOIN public.ep_consultants ec ON ec.user_id = auth.uid() AND ec.active = true
    WHERE pm.id = milestone_id AND pb.is_active = true
  )
);

CREATE POLICY "Manage checklist items for admins"
ON public.playbook_checklist_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.ep_consultants ec 
    WHERE ec.user_id = auth.uid() AND ec.active = true
  )
);

-- RLS for playbook_guides
CREATE POLICY "View guides of accessible playbooks"
ON public.playbook_guides FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_playbooks pb
    JOIN public.ep_consultants ec ON ec.user_id = auth.uid() AND ec.active = true
    WHERE pb.id = playbook_id AND pb.is_active = true
  )
);

CREATE POLICY "Manage guides for admins"
ON public.playbook_guides FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.ep_consultants ec 
    WHERE ec.user_id = auth.uid() AND ec.active = true
  )
);

-- RLS for project_playbook_applications
CREATE POLICY "EP team can view playbook applications"
ON public.project_playbook_applications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.consultant_assignments ca
    JOIN public.ep_consultants ec ON ec.id = ca.consultant_id
    WHERE ca.account_id = account_id 
    AND ec.user_id = auth.uid() 
    AND ec.active = true 
    AND ca.active = true
  )
);

CREATE POLICY "EP team can apply playbooks to assigned accounts"
ON public.project_playbook_applications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.consultant_assignments ca
    JOIN public.ep_consultants ec ON ec.id = ca.consultant_id
    WHERE ca.account_id = account_id 
    AND ec.user_id = auth.uid() 
    AND ec.active = true 
    AND ca.active = true
  )
);

CREATE POLICY "EP team can update playbook applications"
ON public.project_playbook_applications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.consultant_assignments ca
    JOIN public.ep_consultants ec ON ec.id = ca.consultant_id
    WHERE ca.account_id = account_id 
    AND ec.user_id = auth.uid() 
    AND ec.active = true 
    AND ca.active = true
  )
);

-- Account members can view playbook application for their account
CREATE POLICY "Account members can view playbook applications"
ON public.project_playbook_applications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = account_id 
    AND am.user_id = auth.uid() 
    AND am.is_active = true
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_project_playbooks_updated_at
BEFORE UPDATE ON public.project_playbooks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playbook_phases_updated_at
BEFORE UPDATE ON public.playbook_phases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playbook_milestones_updated_at
BEFORE UPDATE ON public.playbook_milestones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playbook_guides_updated_at
BEFORE UPDATE ON public.playbook_guides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- INSERT DEFAULT PLAYBOOKS
-- =====================================================

-- Playbook 1: Implementação Completa (12 semanas)
INSERT INTO public.project_playbooks (name, description, category, estimated_duration_weeks, is_default, icon, color)
VALUES (
  'Implementação Completa',
  'Programa completo de implementação da metodologia EP, cobrindo todos os 8 pilares com profundidade e acompanhamento detalhado.',
  'implementation',
  12,
  true,
  'rocket',
  '#3B82F6'
);

-- Playbook 2: Fast Track (6 semanas)
INSERT INTO public.project_playbooks (name, description, category, estimated_duration_weeks, icon, color)
VALUES (
  'Fast Track',
  'Versão acelerada para empresas menores ou com necessidade de resultados rápidos. Foco nos pilares essenciais.',
  'implementation',
  6,
  'zap',
  '#10B981'
);

-- Playbook 3: Resgate (8 semanas)
INSERT INTO public.project_playbooks (name, description, category, estimated_duration_weeks, icon, color)
VALUES (
  'Projeto Resgate',
  'Para projetos em situação crítica que precisam de recuperação. Foco em diagnóstico profundo e ações corretivas.',
  'rescue',
  8,
  'life-buoy',
  '#EF4444'
);