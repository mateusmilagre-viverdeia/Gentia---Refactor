-- =============================================
-- SISTEMA DE EVOLUÇÃO - Estrutura de Dados
-- =============================================

-- 1. Tabela Principal: Ciclos de Evolução
CREATE TABLE public.evolution_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  collaborator_name TEXT NOT NULL,
  collaborator_email TEXT,
  leader_name TEXT,
  leader_email TEXT,
  job_description_id UUID REFERENCES public.job_descriptions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela: Competências do Ciclo (Propósito - Etapa 1)
CREATE TABLE public.evolution_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.evolution_cycles(id) ON DELETE CASCADE,
  competency_name TEXT NOT NULL,
  competency_type TEXT NOT NULL CHECK (competency_type IN ('technical', 'behavioral')),
  strategic_justification TEXT NOT NULL,
  expected_impact TEXT NOT NULL,
  source TEXT CHECK (source IN ('job_description', 'performance_assessment', 'cultural_assessment', 'strategic_project', 'manual')),
  source_reference_id UUID,
  is_priority BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabela: Objetivos de Evolução (Progresso - Etapa 2)
CREATE TABLE public.evolution_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.evolution_cycles(id) ON DELETE CASCADE,
  competency_id UUID REFERENCES public.evolution_competencies(id) ON DELETE SET NULL,
  objective_text TEXT NOT NULL,
  key_behaviors TEXT[] NOT NULL DEFAULT '{}',
  progress_indicators TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabela: Ações de Performance (Etapa 3)
CREATE TABLE public.evolution_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.evolution_objectives(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('practical', 'support', 'learning')),
  description TEXT NOT NULL,
  linked_project_id UUID REFERENCES public.strategic_projects(id) ON DELETE SET NULL,
  linked_project_name TEXT,
  responsible TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  evidence_description TEXT,
  evidence_url TEXT,
  completed_at TIMESTAMPTZ,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabela: Check-ins do Ciclo
CREATE TABLE public.evolution_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.evolution_cycles(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  checkin_type TEXT DEFAULT 'regular' CHECK (checkin_type IN ('regular', 'milestone', 'final')),
  planned_vs_executed TEXT,
  perceived_evolution TEXT,
  real_evidence TEXT,
  blockers TEXT,
  next_steps TEXT,
  overall_progress INTEGER CHECK (overall_progress >= 0 AND overall_progress <= 100),
  ai_generated_questions JSONB DEFAULT '[]',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tabela: Feedbacks do Ciclo
CREATE TABLE public.evolution_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.evolution_cycles(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('leader', 'peer', 'self', 'ai_suggestion')),
  content TEXT NOT NULL,
  translated_focus TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX idx_evolution_cycles_account_id ON public.evolution_cycles(account_id);
CREATE INDEX idx_evolution_cycles_status ON public.evolution_cycles(status);
CREATE INDEX idx_evolution_cycles_collaborator ON public.evolution_cycles(collaborator_name);
CREATE INDEX idx_evolution_cycles_dates ON public.evolution_cycles(start_date, end_date);
CREATE INDEX idx_evolution_competencies_cycle ON public.evolution_competencies(cycle_id);
CREATE INDEX idx_evolution_objectives_cycle ON public.evolution_objectives(cycle_id);
CREATE INDEX idx_evolution_objectives_status ON public.evolution_objectives(status);
CREATE INDEX idx_evolution_actions_objective ON public.evolution_actions(objective_id);
CREATE INDEX idx_evolution_actions_status ON public.evolution_actions(status);
CREATE INDEX idx_evolution_actions_due_date ON public.evolution_actions(due_date);
CREATE INDEX idx_evolution_checkins_cycle ON public.evolution_checkins(cycle_id);
CREATE INDEX idx_evolution_checkins_date ON public.evolution_checkins(checkin_date);
CREATE INDEX idx_evolution_feedbacks_cycle ON public.evolution_feedbacks(cycle_id);

-- =============================================
-- TRIGGER para updated_at
-- =============================================
CREATE TRIGGER update_evolution_cycles_updated_at
  BEFORE UPDATE ON public.evolution_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evolution_objectives_updated_at
  BEFORE UPDATE ON public.evolution_objectives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evolution_actions_updated_at
  BEFORE UPDATE ON public.evolution_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.evolution_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_feedbacks ENABLE ROW LEVEL SECURITY;

-- Policies para evolution_cycles
CREATE POLICY "Users can view evolution cycles in their account"
  ON public.evolution_cycles FOR SELECT
  USING (account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create evolution cycles in their account"
  ON public.evolution_cycles FOR INSERT
  WITH CHECK (account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update evolution cycles in their account"
  ON public.evolution_cycles FOR UPDATE
  USING (account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete evolution cycles in their account"
  ON public.evolution_cycles FOR DELETE
  USING (account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid()));

-- Policies para evolution_competencies (via cycle)
CREATE POLICY "Users can view evolution competencies"
  ON public.evolution_competencies FOR SELECT
  USING (cycle_id IN (
    SELECT id FROM public.evolution_cycles 
    WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  ));

CREATE POLICY "Users can manage evolution competencies"
  ON public.evolution_competencies FOR ALL
  USING (cycle_id IN (
    SELECT id FROM public.evolution_cycles 
    WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  ));

-- Policies para evolution_objectives (via cycle)
CREATE POLICY "Users can view evolution objectives"
  ON public.evolution_objectives FOR SELECT
  USING (cycle_id IN (
    SELECT id FROM public.evolution_cycles 
    WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  ));

CREATE POLICY "Users can manage evolution objectives"
  ON public.evolution_objectives FOR ALL
  USING (cycle_id IN (
    SELECT id FROM public.evolution_cycles 
    WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  ));

-- Policies para evolution_actions (via objective -> cycle)
CREATE POLICY "Users can view evolution actions"
  ON public.evolution_actions FOR SELECT
  USING (objective_id IN (
    SELECT o.id FROM public.evolution_objectives o
    JOIN public.evolution_cycles c ON o.cycle_id = c.id
    WHERE c.account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  ));

CREATE POLICY "Users can manage evolution actions"
  ON public.evolution_actions FOR ALL
  USING (objective_id IN (
    SELECT o.id FROM public.evolution_objectives o
    JOIN public.evolution_cycles c ON o.cycle_id = c.id
    WHERE c.account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  ));

-- Policies para evolution_checkins (via cycle)
CREATE POLICY "Users can view evolution checkins"
  ON public.evolution_checkins FOR SELECT
  USING (cycle_id IN (
    SELECT id FROM public.evolution_cycles 
    WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  ));

CREATE POLICY "Users can manage evolution checkins"
  ON public.evolution_checkins FOR ALL
  USING (cycle_id IN (
    SELECT id FROM public.evolution_cycles 
    WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  ));

-- Policies para evolution_feedbacks (via cycle)
CREATE POLICY "Users can view evolution feedbacks"
  ON public.evolution_feedbacks FOR SELECT
  USING (cycle_id IN (
    SELECT id FROM public.evolution_cycles 
    WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  ));

CREATE POLICY "Users can manage evolution feedbacks"
  ON public.evolution_feedbacks FOR ALL
  USING (cycle_id IN (
    SELECT id FROM public.evolution_cycles 
    WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  ));

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.evolution_cycles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.evolution_checkins;