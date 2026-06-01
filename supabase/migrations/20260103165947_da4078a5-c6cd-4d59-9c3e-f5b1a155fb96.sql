-- ===========================================
-- SISTEMA DE CARGOS E SALÁRIOS (V.A.L.O.R)
-- ===========================================

-- 1. Modelos de Cargos e Salários (múltiplos por empresa)
CREATE TABLE public.compensation_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  strategy_type TEXT DEFAULT 'growth' CHECK (strategy_type IN ('growth', 'efficiency', 'turnaround')),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Famílias de Cargos
CREATE TABLE public.job_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.compensation_models(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  career_track TEXT DEFAULT 'technical' CHECK (career_track IN ('technical', 'leadership', 'specialist')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Cargos (Positions)
CREATE TABLE public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.job_families(id) ON DELETE CASCADE,
  job_description_id UUID REFERENCES public.job_descriptions(id) ON DELETE SET NULL,
  org_node_id UUID REFERENCES public.org_chart_nodes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT,
  -- V - VALOR
  mission TEXT,
  strategic_value TEXT,
  business_problem TEXT,
  strategic_delivery TEXT,
  -- A - ARQUITETURA
  area TEXT,
  sub_area TEXT,
  reports_to TEXT,
  critical_interfaces TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Níveis de Complexidade (L - LEVEL)
CREATE TABLE public.position_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  level_order INTEGER NOT NULL,
  -- Critérios de Diferenciação
  autonomy_level TEXT,
  complexity_level TEXT,
  impact_level TEXT,
  decision_scope TEXT,
  influence_degree TEXT,
  custom_criteria JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Faixas Salariais (R - REMUNERAÇÃO)
CREATE TABLE public.salary_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID NOT NULL REFERENCES public.position_levels(id) ON DELETE CASCADE,
  minimum DECIMAL(12,2) NOT NULL,
  midpoint DECIMAL(12,2) NOT NULL,
  maximum DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  periodicity TEXT DEFAULT 'monthly' CHECK (periodicity IN ('monthly', 'yearly')),
  effective_date DATE DEFAULT CURRENT_DATE,
  market_reference JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Entregas Esperadas (O - OUTCOME)
CREATE TABLE public.level_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID NOT NULL REFERENCES public.position_levels(id) ON DELETE CASCADE,
  outcome_type TEXT NOT NULL CHECK (outcome_type IN ('delivery', 'indicator', 'behavior')),
  description TEXT NOT NULL,
  measurement TEXT,
  connected_to TEXT CHECK (connected_to IN ('performance', 'evolution', 'merit')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Critérios de Progressão
CREATE TABLE public.progression_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_level_id UUID NOT NULL REFERENCES public.position_levels(id) ON DELETE CASCADE,
  to_level_id UUID NOT NULL REFERENCES public.position_levels(id) ON DELETE CASCADE,
  criterion_type TEXT NOT NULL CHECK (criterion_type IN ('performance', 'evolution', 'time', 'market', 'custom')),
  description TEXT NOT NULL,
  weight INTEGER DEFAULT 1,
  minimum_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Posicionamento de Colaboradores
CREATE TABLE public.employee_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.position_levels(id) ON DELETE CASCADE,
  current_salary DECIMAL(12,2),
  effective_date DATE DEFAULT CURRENT_DATE,
  range_position DECIMAL(5,2),
  progression_status TEXT DEFAULT 'developing' CHECK (progression_status IN ('entry', 'developing', 'ready', 'exceeding')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Histórico Salarial
CREATE TABLE public.salary_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_position_id UUID NOT NULL REFERENCES public.employee_positions(id) ON DELETE CASCADE,
  previous_salary DECIMAL(12,2),
  new_salary DECIMAL(12,2),
  change_type TEXT NOT NULL CHECK (change_type IN ('merit', 'promotion', 'adjustment', 'market')),
  reason TEXT,
  effective_date DATE NOT NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- ENABLE RLS
-- ===========================================
ALTER TABLE public.compensation_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_history ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS POLICIES
-- ===========================================

-- Compensation Models
CREATE POLICY "Users can view compensation models of their account"
ON public.compensation_models FOR SELECT
USING (account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage compensation models of their account"
ON public.compensation_models FOR ALL
USING (account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid()));

-- Job Families (via model)
CREATE POLICY "Users can view job families of their account"
ON public.job_families FOR SELECT
USING (model_id IN (
  SELECT id FROM public.compensation_models 
  WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
));

CREATE POLICY "Users can manage job families of their account"
ON public.job_families FOR ALL
USING (model_id IN (
  SELECT id FROM public.compensation_models 
  WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
));

-- Positions (via family -> model)
CREATE POLICY "Users can view positions of their account"
ON public.positions FOR SELECT
USING (family_id IN (
  SELECT jf.id FROM public.job_families jf
  JOIN public.compensation_models cm ON cm.id = jf.model_id
  WHERE cm.account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
));

CREATE POLICY "Users can manage positions of their account"
ON public.positions FOR ALL
USING (family_id IN (
  SELECT jf.id FROM public.job_families jf
  JOIN public.compensation_models cm ON cm.id = jf.model_id
  WHERE cm.account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
));

-- Position Levels (via position -> family -> model)
CREATE POLICY "Users can view position levels of their account"
ON public.position_levels FOR SELECT
USING (position_id IN (
  SELECT p.id FROM public.positions p
  JOIN public.job_families jf ON jf.id = p.family_id
  JOIN public.compensation_models cm ON cm.id = jf.model_id
  WHERE cm.account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
));

CREATE POLICY "Users can manage position levels of their account"
ON public.position_levels FOR ALL
USING (position_id IN (
  SELECT p.id FROM public.positions p
  JOIN public.job_families jf ON jf.id = p.family_id
  JOIN public.compensation_models cm ON cm.id = jf.model_id
  WHERE cm.account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
));

-- Salary Ranges (via level -> position -> family -> model)
CREATE POLICY "Users can view salary ranges of their account"
ON public.salary_ranges FOR SELECT
USING (level_id IN (
  SELECT pl.id FROM public.position_levels pl
  JOIN public.positions p ON p.id = pl.position_id
  JOIN public.job_families jf ON jf.id = p.family_id
  JOIN public.compensation_models cm ON cm.id = jf.model_id
  WHERE cm.account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
));

CREATE POLICY "Users can manage salary ranges of their account"
ON public.salary_ranges FOR ALL
USING (level_id IN (
  SELECT pl.id FROM public.position_levels pl
  JOIN public.positions p ON p.id = pl.position_id
  JOIN public.job_families jf ON jf.id = p.family_id
  JOIN public.compensation_models cm ON cm.id = jf.model_id
  WHERE cm.account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
));

-- Level Outcomes (via level)
CREATE POLICY "Users can view level outcomes of their account"
ON public.level_outcomes FOR SELECT
USING (level_id IN (
  SELECT pl.id FROM public.position_levels pl
  JOIN public.positions p ON p.id = pl.position_id
  JOIN public.job_families jf ON jf.id = p.family_id
  JOIN public.compensation_models cm ON cm.id = jf.model_id
  WHERE cm.account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
));

CREATE POLICY "Users can manage level outcomes of their account"
ON public.level_outcomes FOR ALL
USING (level_id IN (
  SELECT pl.id FROM public.position_levels pl
  JOIN public.positions p ON p.id = pl.position_id
  JOIN public.job_families jf ON jf.id = p.family_id
  JOIN public.compensation_models cm ON cm.id = jf.model_id
  WHERE cm.account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
));

-- Progression Criteria
CREATE POLICY "Users can view progression criteria of their account"
ON public.progression_criteria FOR SELECT
USING (from_level_id IN (
  SELECT pl.id FROM public.position_levels pl
  JOIN public.positions p ON p.id = pl.position_id
  JOIN public.job_families jf ON jf.id = p.family_id
  JOIN public.compensation_models cm ON cm.id = jf.model_id
  WHERE cm.account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
));

CREATE POLICY "Users can manage progression criteria of their account"
ON public.progression_criteria FOR ALL
USING (from_level_id IN (
  SELECT pl.id FROM public.position_levels pl
  JOIN public.positions p ON p.id = pl.position_id
  JOIN public.job_families jf ON jf.id = p.family_id
  JOIN public.compensation_models cm ON cm.id = jf.model_id
  WHERE cm.account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
));

-- Employee Positions
CREATE POLICY "Users can view employee positions of their account"
ON public.employee_positions FOR SELECT
USING (level_id IN (
  SELECT pl.id FROM public.position_levels pl
  JOIN public.positions p ON p.id = pl.position_id
  JOIN public.job_families jf ON jf.id = p.family_id
  JOIN public.compensation_models cm ON cm.id = jf.model_id
  WHERE cm.account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
));

CREATE POLICY "Users can manage employee positions of their account"
ON public.employee_positions FOR ALL
USING (level_id IN (
  SELECT pl.id FROM public.position_levels pl
  JOIN public.positions p ON p.id = pl.position_id
  JOIN public.job_families jf ON jf.id = p.family_id
  JOIN public.compensation_models cm ON cm.id = jf.model_id
  WHERE cm.account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
));

-- Salary History
CREATE POLICY "Users can view salary history of their account"
ON public.salary_history FOR SELECT
USING (employee_position_id IN (
  SELECT ep.id FROM public.employee_positions ep
  JOIN public.position_levels pl ON pl.id = ep.level_id
  JOIN public.positions p ON p.id = pl.position_id
  JOIN public.job_families jf ON jf.id = p.family_id
  JOIN public.compensation_models cm ON cm.id = jf.model_id
  WHERE cm.account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
));

CREATE POLICY "Users can manage salary history of their account"
ON public.salary_history FOR ALL
USING (employee_position_id IN (
  SELECT ep.id FROM public.employee_positions ep
  JOIN public.position_levels pl ON pl.id = ep.level_id
  JOIN public.positions p ON p.id = pl.position_id
  JOIN public.job_families jf ON jf.id = p.family_id
  JOIN public.compensation_models cm ON cm.id = jf.model_id
  WHERE cm.account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
));

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX idx_compensation_models_account ON public.compensation_models(account_id);
CREATE INDEX idx_job_families_model ON public.job_families(model_id);
CREATE INDEX idx_positions_family ON public.positions(family_id);
CREATE INDEX idx_position_levels_position ON public.position_levels(position_id);
CREATE INDEX idx_salary_ranges_level ON public.salary_ranges(level_id);
CREATE INDEX idx_level_outcomes_level ON public.level_outcomes(level_id);
CREATE INDEX idx_employee_positions_profile ON public.employee_positions(profile_id);
CREATE INDEX idx_employee_positions_level ON public.employee_positions(level_id);
CREATE INDEX idx_salary_history_employee ON public.salary_history(employee_position_id);

-- ===========================================
-- TRIGGERS FOR UPDATED_AT
-- ===========================================
CREATE TRIGGER update_compensation_models_updated_at
  BEFORE UPDATE ON public.compensation_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_positions_updated_at
  BEFORE UPDATE ON public.employee_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();