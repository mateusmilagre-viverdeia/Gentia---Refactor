
-- =====================================================
-- MÓDULO PULSE DIÁRIO - FASE 1: ESTRUTURA DE DADOS
-- =====================================================

-- Enum para roles do Pulse
DO $$ BEGIN
  CREATE TYPE pulse_user_role AS ENUM ('admin_rh', 'leader', 'employee');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABELAS CORE
-- =====================================================

-- Times para estrutura organizacional do Pulse
CREATE TABLE public.pulse_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  leader_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Perfis de usuário estendidos para Pulse
CREATE TABLE public.pulse_user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.pulse_teams(id) ON DELETE SET NULL,
  role pulse_user_role DEFAULT 'employee',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, account_id)
);

-- Sets de emoji (escalas visuais)
CREATE TABLE public.pulse_emoji_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('likert5', 'energy5', 'clarity5', 'pride5', 'culture5')),
  options JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Drivers (dimensões de engajamento)
CREATE TABLE public.pulse_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  default_emoji_set_id UUID REFERENCES public.pulse_emoji_sets(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pilares macro
CREATE TABLE public.pulse_pillars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mapeamento Pilar <-> Driver
CREATE TABLE public.pulse_pillar_driver_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  pillar_id UUID NOT NULL REFERENCES public.pulse_pillars(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.pulse_drivers(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pillar_id, driver_id)
);

-- Valores da empresa (para multi-select)
CREATE TABLE public.pulse_company_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, key)
);

-- Perguntas
CREATE TABLE public.pulse_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.pulse_drivers(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  answer_type TEXT CHECK (answer_type IN ('emoji_scale', 'multi_select')) DEFAULT 'emoji_scale',
  emoji_set_id UUID REFERENCES public.pulse_emoji_sets(id) ON DELETE SET NULL,
  multi_select_source TEXT CHECK (multi_select_source IN ('company_values', NULL)),
  is_anonymous BOOLEAN DEFAULT false,
  max_repeat_per_month INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  ai_generated BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]',
  created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Regras de agendamento
CREATE TABLE public.pulse_schedule_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  daily_questions_count INTEGER DEFAULT 3 CHECK (daily_questions_count BETWEEN 1 AND 5),
  must_include_driver_keys JSONB DEFAULT '["mood_energy"]',
  prefer_driver_keys JSONB DEFAULT '["culture_values", "purpose"]',
  rotation_pool_driver_keys JSONB DEFAULT '[]',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  max_repeat_block_days INTEGER DEFAULT 7,
  anonymous_driver_keys JSONB DEFAULT '["mood_energy", "wellbeing"]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id)
);

-- Assignments diários
CREATE TABLE public.pulse_daily_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  generated_by TEXT DEFAULT 'system' CHECK (generated_by IN ('system', 'admin', 'ai')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, date)
);

CREATE TABLE public.pulse_daily_assignment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.pulse_daily_assignments(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL CHECK (order_index BETWEEN 1 AND 5),
  question_id UUID NOT NULL REFERENCES public.pulse_questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assignment_id, order_index)
);

-- Respostas
CREATE TABLE public.pulse_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.pulse_daily_assignments(id) ON DELETE SET NULL,
  question_id UUID NOT NULL REFERENCES public.pulse_questions(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  respondent_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  respondent_team_id UUID REFERENCES public.pulse_teams(id) ON DELETE SET NULL,
  respondent_leader_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  numeric_score NUMERIC(3,1) CHECK (numeric_score BETWEEN 0 AND 10),
  raw_emoji TEXT,
  multi_select_values JSONB,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Métricas agregadas diárias
CREATE TABLE public.pulse_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_users INTEGER DEFAULT 0,
  responded_users INTEGER DEFAULT 0,
  engagement_score_avg NUMERIC(4,2),
  participation_rate NUMERIC(5,2),
  non_participation_count INTEGER DEFAULT 0,
  by_pillar JSONB DEFAULT '{}',
  by_driver JSONB DEFAULT '{}',
  by_team JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, date)
);

-- Streaks dos colaboradores
CREATE TABLE public.pulse_user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_response_date DATE,
  total_responses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, user_id)
);

-- =====================================================
-- GAMIFICAÇÃO
-- =====================================================

-- Regras de gamificação
CREATE TABLE public.pulse_gamification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Log de pontos
CREATE TABLE public.pulse_gamification_points_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.pulse_teams(id) ON DELETE SET NULL,
  event_key TEXT NOT NULL,
  points_delta INTEGER NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Badges
CREATE TABLE public.pulse_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_emoji TEXT NOT NULL,
  tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')) DEFAULT 'bronze',
  category TEXT CHECK (category IN ('streak', 'participation', 'leadership', 'culture', 'improvement')) DEFAULT 'participation',
  criteria JSONB NOT NULL DEFAULT '{}',
  points_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Badges desbloqueados por usuário
CREATE TABLE public.pulse_user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.pulse_badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  notified BOOLEAN DEFAULT false,
  UNIQUE(account_id, user_id, badge_id)
);

-- Níveis de gamificação
CREATE TABLE public.pulse_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL CHECK (level_number BETWEEN 1 AND 10),
  name TEXT NOT NULL,
  description TEXT,
  min_points INTEGER NOT NULL DEFAULT 0,
  icon_emoji TEXT,
  perks JSONB DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, level_number)
);

-- Progresso do usuário
CREATE TABLE public.pulse_user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, user_id)
);

-- =====================================================
-- AÇÕES E ALERTAS
-- =====================================================

-- Ações de transparência (devolutivas)
CREATE TABLE public.pulse_admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  related_pillar_id UUID REFERENCES public.pulse_pillars(id) ON DELETE SET NULL,
  related_driver_id UUID REFERENCES public.pulse_drivers(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('planned', 'doing', 'done', 'wont_do_now')) DEFAULT 'planned',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  due_date DATE,
  created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Alertas
CREATE TABLE public.pulse_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('score_drop', 'low_participation', 'low_score_persistent', 'team_divergence', 'improvement')),
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'warning',
  title TEXT NOT NULL,
  description TEXT,
  related_team_id UUID REFERENCES public.pulse_teams(id) ON DELETE SET NULL,
  related_driver_id UUID REFERENCES public.pulse_drivers(id) ON DELETE SET NULL,
  related_pillar_id UUID REFERENCES public.pulse_pillars(id) ON DELETE SET NULL,
  metric_value NUMERIC(4,2),
  threshold_value NUMERIC(4,2),
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- HISTÓRICO DE PERGUNTAS (para evitar repetição)
-- =====================================================

CREATE TABLE public.pulse_question_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.pulse_questions(id) ON DELETE CASCADE,
  used_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, question_id, used_date)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_pulse_teams_account ON public.pulse_teams(account_id);
CREATE INDEX idx_pulse_teams_leader ON public.pulse_teams(leader_user_id);
CREATE INDEX idx_pulse_user_profiles_account ON public.pulse_user_profiles(account_id);
CREATE INDEX idx_pulse_user_profiles_team ON public.pulse_user_profiles(team_id);
CREATE INDEX idx_pulse_user_profiles_user ON public.pulse_user_profiles(user_id);
CREATE INDEX idx_pulse_drivers_account ON public.pulse_drivers(account_id);
CREATE INDEX idx_pulse_drivers_key ON public.pulse_drivers(key);
CREATE INDEX idx_pulse_pillars_account ON public.pulse_pillars(account_id);
CREATE INDEX idx_pulse_questions_account ON public.pulse_questions(account_id);
CREATE INDEX idx_pulse_questions_driver ON public.pulse_questions(driver_id);
CREATE INDEX idx_pulse_questions_active ON public.pulse_questions(account_id, is_active);
CREATE INDEX idx_pulse_daily_assignments_date ON public.pulse_daily_assignments(account_id, date);
CREATE INDEX idx_pulse_responses_account_date ON public.pulse_responses(account_id, date);
CREATE INDEX idx_pulse_responses_user ON public.pulse_responses(respondent_user_id);
CREATE INDEX idx_pulse_responses_team ON public.pulse_responses(respondent_team_id);
CREATE INDEX idx_pulse_responses_assignment ON public.pulse_responses(assignment_id);
CREATE INDEX idx_pulse_metrics_daily_date ON public.pulse_metrics_daily(account_id, date);
CREATE INDEX idx_pulse_user_streaks_user ON public.pulse_user_streaks(user_id);
CREATE INDEX idx_pulse_points_log_user ON public.pulse_gamification_points_log(user_id);
CREATE INDEX idx_pulse_user_badges_user ON public.pulse_user_badges(user_id);
CREATE INDEX idx_pulse_alerts_account ON public.pulse_alerts(account_id, is_resolved);
CREATE INDEX idx_pulse_question_history_account ON public.pulse_question_history(account_id, used_date);

-- =====================================================
-- FUNÇÕES HELPER PARA RLS
-- =====================================================

-- Verifica se usuário tem role específica no Pulse
CREATE OR REPLACE FUNCTION public.get_pulse_user_role(_user_id UUID, _account_id UUID)
RETURNS pulse_user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM pulse_user_profiles
  WHERE user_id = _user_id AND account_id = _account_id AND is_active = true
  LIMIT 1
$$;

-- Verifica se é admin RH do Pulse
CREATE OR REPLACE FUNCTION public.is_pulse_admin(_user_id UUID, _account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pulse_user_profiles
    WHERE user_id = _user_id 
    AND account_id = _account_id 
    AND role = 'admin_rh'
    AND is_active = true
  ) OR is_super_admin(_user_id) OR is_account_admin_or_owner(_user_id, _account_id)
$$;

-- Verifica se é líder do Pulse
CREATE OR REPLACE FUNCTION public.is_pulse_leader(_user_id UUID, _account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pulse_user_profiles
    WHERE user_id = _user_id 
    AND account_id = _account_id 
    AND role IN ('admin_rh', 'leader')
    AND is_active = true
  ) OR is_pulse_admin(_user_id, _account_id)
$$;

-- Retorna os times que o líder gerencia
CREATE OR REPLACE FUNCTION public.get_leader_team_ids(_user_id UUID, _account_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(id) FROM pulse_teams
  WHERE account_id = _account_id 
  AND leader_user_id = _user_id 
  AND is_active = true
$$;

-- Verifica se usuário pertence a um time específico
CREATE OR REPLACE FUNCTION public.is_pulse_team_member(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pulse_user_profiles
    WHERE user_id = _user_id 
    AND team_id = _team_id
    AND is_active = true
  )
$$;

-- =====================================================
-- HABILITAR RLS
-- =====================================================

ALTER TABLE public.pulse_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_emoji_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_pillar_driver_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_company_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_schedule_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_daily_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_daily_assignment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_gamification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_gamification_points_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_question_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- pulse_teams
CREATE POLICY "Members can view their account teams" ON public.pulse_teams
  FOR SELECT USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Admins can manage teams" ON public.pulse_teams
  FOR ALL USING (is_pulse_admin(auth.uid(), account_id));

-- pulse_user_profiles
CREATE POLICY "Users can view own profile" ON public.pulse_user_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Members can view account profiles" ON public.pulse_user_profiles
  FOR SELECT USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Admins can manage profiles" ON public.pulse_user_profiles
  FOR ALL USING (is_pulse_admin(auth.uid(), account_id));

-- pulse_emoji_sets
CREATE POLICY "Anyone can view emoji sets" ON public.pulse_emoji_sets
  FOR SELECT USING (account_id IS NULL OR is_account_member(auth.uid(), account_id));

CREATE POLICY "Admins can manage emoji sets" ON public.pulse_emoji_sets
  FOR ALL USING (account_id IS NOT NULL AND is_pulse_admin(auth.uid(), account_id));

-- pulse_drivers
CREATE POLICY "Anyone can view drivers" ON public.pulse_drivers
  FOR SELECT USING (account_id IS NULL OR is_account_member(auth.uid(), account_id));

CREATE POLICY "Admins can manage drivers" ON public.pulse_drivers
  FOR ALL USING (account_id IS NOT NULL AND is_pulse_admin(auth.uid(), account_id));

-- pulse_pillars
CREATE POLICY "Anyone can view pillars" ON public.pulse_pillars
  FOR SELECT USING (account_id IS NULL OR is_account_member(auth.uid(), account_id));

CREATE POLICY "Admins can manage pillars" ON public.pulse_pillars
  FOR ALL USING (account_id IS NOT NULL AND is_pulse_admin(auth.uid(), account_id));

-- pulse_pillar_driver_map
CREATE POLICY "Anyone can view pillar driver map" ON public.pulse_pillar_driver_map
  FOR SELECT USING (account_id IS NULL OR is_account_member(auth.uid(), account_id));

CREATE POLICY "Admins can manage pillar driver map" ON public.pulse_pillar_driver_map
  FOR ALL USING (account_id IS NOT NULL AND is_pulse_admin(auth.uid(), account_id));

-- pulse_company_values
CREATE POLICY "Members can view company values" ON public.pulse_company_values
  FOR SELECT USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Admins can manage company values" ON public.pulse_company_values
  FOR ALL USING (is_pulse_admin(auth.uid(), account_id));

-- pulse_questions
CREATE POLICY "Members can view active questions" ON public.pulse_questions
  FOR SELECT USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Admins can manage questions" ON public.pulse_questions
  FOR ALL USING (is_pulse_admin(auth.uid(), account_id));

-- pulse_schedule_rules
CREATE POLICY "Admins can view schedule rules" ON public.pulse_schedule_rules
  FOR SELECT USING (is_pulse_leader(auth.uid(), account_id));

CREATE POLICY "Admins can manage schedule rules" ON public.pulse_schedule_rules
  FOR ALL USING (is_pulse_admin(auth.uid(), account_id));

-- pulse_daily_assignments
CREATE POLICY "Members can view assignments" ON public.pulse_daily_assignments
  FOR SELECT USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Admins can manage assignments" ON public.pulse_daily_assignments
  FOR ALL USING (is_pulse_admin(auth.uid(), account_id));

-- pulse_daily_assignment_items
CREATE POLICY "Members can view assignment items" ON public.pulse_daily_assignment_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pulse_daily_assignments pda
      WHERE pda.id = assignment_id
      AND is_account_member(auth.uid(), pda.account_id)
    )
  );

CREATE POLICY "Admins can manage assignment items" ON public.pulse_daily_assignment_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pulse_daily_assignments pda
      WHERE pda.id = assignment_id
      AND is_pulse_admin(auth.uid(), pda.account_id)
    )
  );

-- pulse_responses
CREATE POLICY "Users can insert own responses" ON public.pulse_responses
  FOR INSERT WITH CHECK (
    is_account_member(auth.uid(), account_id) AND
    (respondent_user_id = auth.uid() OR respondent_user_id IS NULL)
  );

CREATE POLICY "Users can view own identified responses" ON public.pulse_responses
  FOR SELECT USING (
    respondent_user_id = auth.uid() AND is_anonymous = false
  );

CREATE POLICY "Leaders can view team aggregated responses" ON public.pulse_responses
  FOR SELECT USING (
    is_pulse_leader(auth.uid(), account_id) AND
    (
      is_anonymous = false OR
      respondent_team_id = ANY(get_leader_team_ids(auth.uid(), account_id))
    )
  );

CREATE POLICY "Admins can view all responses" ON public.pulse_responses
  FOR SELECT USING (is_pulse_admin(auth.uid(), account_id));

-- pulse_metrics_daily
CREATE POLICY "Leaders can view metrics" ON public.pulse_metrics_daily
  FOR SELECT USING (is_pulse_leader(auth.uid(), account_id));

CREATE POLICY "Admins can manage metrics" ON public.pulse_metrics_daily
  FOR ALL USING (is_pulse_admin(auth.uid(), account_id));

-- pulse_user_streaks
CREATE POLICY "Users can view own streak" ON public.pulse_user_streaks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own streak" ON public.pulse_user_streaks
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all streaks" ON public.pulse_user_streaks
  FOR SELECT USING (is_pulse_admin(auth.uid(), account_id));

-- pulse_gamification_rules
CREATE POLICY "Anyone can view gamification rules" ON public.pulse_gamification_rules
  FOR SELECT USING (account_id IS NULL OR is_account_member(auth.uid(), account_id));

CREATE POLICY "Admins can manage gamification rules" ON public.pulse_gamification_rules
  FOR ALL USING (account_id IS NOT NULL AND is_pulse_admin(auth.uid(), account_id));

-- pulse_gamification_points_log
CREATE POLICY "Users can view own points" ON public.pulse_gamification_points_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage points" ON public.pulse_gamification_points_log
  FOR ALL USING (is_pulse_admin(auth.uid(), account_id));

-- pulse_badges
CREATE POLICY "Anyone can view badges" ON public.pulse_badges
  FOR SELECT USING (account_id IS NULL OR is_account_member(auth.uid(), account_id));

CREATE POLICY "Admins can manage badges" ON public.pulse_badges
  FOR ALL USING (account_id IS NOT NULL AND is_pulse_admin(auth.uid(), account_id));

-- pulse_user_badges
CREATE POLICY "Users can view own badges" ON public.pulse_user_badges
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Members can view account badges" ON public.pulse_user_badges
  FOR SELECT USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Admins can manage user badges" ON public.pulse_user_badges
  FOR ALL USING (is_pulse_admin(auth.uid(), account_id));

-- pulse_levels
CREATE POLICY "Anyone can view levels" ON public.pulse_levels
  FOR SELECT USING (account_id IS NULL OR is_account_member(auth.uid(), account_id));

CREATE POLICY "Admins can manage levels" ON public.pulse_levels
  FOR ALL USING (account_id IS NOT NULL AND is_pulse_admin(auth.uid(), account_id));

-- pulse_user_progress
CREATE POLICY "Users can view own progress" ON public.pulse_user_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own progress" ON public.pulse_user_progress
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Leaders can view team progress" ON public.pulse_user_progress
  FOR SELECT USING (is_pulse_leader(auth.uid(), account_id));

-- pulse_admin_actions
CREATE POLICY "Members can view actions" ON public.pulse_admin_actions
  FOR SELECT USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Admins can manage actions" ON public.pulse_admin_actions
  FOR ALL USING (is_pulse_admin(auth.uid(), account_id));

-- pulse_alerts
CREATE POLICY "Leaders can view alerts" ON public.pulse_alerts
  FOR SELECT USING (is_pulse_leader(auth.uid(), account_id));

CREATE POLICY "Admins can manage alerts" ON public.pulse_alerts
  FOR ALL USING (is_pulse_admin(auth.uid(), account_id));

-- pulse_question_history
CREATE POLICY "Admins can view question history" ON public.pulse_question_history
  FOR SELECT USING (is_pulse_admin(auth.uid(), account_id));

CREATE POLICY "Admins can manage question history" ON public.pulse_question_history
  FOR ALL USING (is_pulse_admin(auth.uid(), account_id));

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_pulse_teams_updated_at
  BEFORE UPDATE ON public.pulse_teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pulse_user_profiles_updated_at
  BEFORE UPDATE ON public.pulse_user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pulse_questions_updated_at
  BEFORE UPDATE ON public.pulse_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pulse_schedule_rules_updated_at
  BEFORE UPDATE ON public.pulse_schedule_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pulse_metrics_daily_updated_at
  BEFORE UPDATE ON public.pulse_metrics_daily
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pulse_user_streaks_updated_at
  BEFORE UPDATE ON public.pulse_user_streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pulse_user_progress_updated_at
  BEFORE UPDATE ON public.pulse_user_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pulse_admin_actions_updated_at
  BEFORE UPDATE ON public.pulse_admin_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- DADOS INICIAIS: EMOJI SETS (5 tipos)
-- =====================================================

INSERT INTO public.pulse_emoji_sets (id, account_id, name, type, options, is_default) VALUES
-- Likert 5 (satisfação geral)
('00000000-0000-0000-0001-000000000001', NULL, 'Satisfação Geral', 'likert5', '[
  {"value": 0, "emoji": "😞", "label": "Muito ruim"},
  {"value": 2.5, "emoji": "😕", "label": "Ruim"},
  {"value": 5, "emoji": "😐", "label": "Ok"},
  {"value": 7.5, "emoji": "🙂", "label": "Bom"},
  {"value": 10, "emoji": "😄", "label": "Excelente"}
]', true),

-- Energy 5 (energia/disposição)
('00000000-0000-0000-0001-000000000002', NULL, 'Energia', 'energy5', '[
  {"value": 0, "emoji": "🪫", "label": "Esgotado"},
  {"value": 2.5, "emoji": "😴", "label": "Cansado"},
  {"value": 5, "emoji": "😐", "label": "Normal"},
  {"value": 7.5, "emoji": "🙂", "label": "Bem"},
  {"value": 10, "emoji": "🔋", "label": "Energizado"}
]', true),

-- Clarity 5 (clareza/entendimento)
('00000000-0000-0000-0001-000000000003', NULL, 'Clareza', 'clarity5', '[
  {"value": 0, "emoji": "❌", "label": "Nada claro"},
  {"value": 2.5, "emoji": "🤔", "label": "Confuso"},
  {"value": 5, "emoji": "😐", "label": "Parcial"},
  {"value": 7.5, "emoji": "👍", "label": "Claro"},
  {"value": 10, "emoji": "🎯", "label": "Muito claro"}
]', true),

-- Pride 5 (orgulho/pertencimento)
('00000000-0000-0000-0001-000000000004', NULL, 'Orgulho', 'pride5', '[
  {"value": 0, "emoji": "😞", "label": "Desconectado"},
  {"value": 2.5, "emoji": "😕", "label": "Pouco"},
  {"value": 5, "emoji": "😐", "label": "Neutro"},
  {"value": 7.5, "emoji": "🙂", "label": "Orgulhoso"},
  {"value": 10, "emoji": "🤩", "label": "Muito orgulhoso"}
]', true),

-- Culture 5 (cultura/valores)
('00000000-0000-0000-0001-000000000005', NULL, 'Cultura', 'culture5', '[
  {"value": 0, "emoji": "❌", "label": "Não vejo"},
  {"value": 2.5, "emoji": "😕", "label": "Raramente"},
  {"value": 5, "emoji": "😐", "label": "Às vezes"},
  {"value": 7.5, "emoji": "👍", "label": "Frequentemente"},
  {"value": 10, "emoji": "🧬", "label": "Sempre"}
]', true);

-- =====================================================
-- DADOS INICIAIS: DRIVERS (12 dimensões)
-- =====================================================

INSERT INTO public.pulse_drivers (id, account_id, key, name, description, default_emoji_set_id, is_anonymous, sort_order, is_active, is_default) VALUES
-- 1. Saúde organizacional (mood + energia) - SEMPRE ANÔNIMO
('00000000-0000-0000-0002-000000000001', NULL, 'mood_energy', 'Saúde & Energia', 
 'Bem-estar, disposição e energia para o trabalho', 
 '00000000-0000-0000-0001-000000000002', true, 1, true, true),

-- 2. Carga de trabalho
('00000000-0000-0000-0002-000000000002', NULL, 'workload', 'Carga de Trabalho', 
 'Equilíbrio entre demandas e capacidade',
 '00000000-0000-0000-0001-000000000001', true, 2, true, true),

-- 3. Clareza das expectativas
('00000000-0000-0000-0002-000000000003', NULL, 'clarity_expectations', 'Clareza das Expectativas', 
 'Entendimento do que é esperado no dia a dia',
 '00000000-0000-0000-0001-000000000003', false, 3, true, true),

-- 4. Visão/direção da empresa
('00000000-0000-0000-0002-000000000004', NULL, 'company_direction', 'Direção da Empresa', 
 'Clareza sobre para onde a empresa está indo',
 '00000000-0000-0000-0001-000000000003', false, 4, true, true),

-- 5. Propósito
('00000000-0000-0000-0002-000000000005', NULL, 'purpose', 'Propósito', 
 'Conexão com o significado do trabalho',
 '00000000-0000-0000-0001-000000000004', false, 5, true, true),

-- 6. Cultura e valores
('00000000-0000-0000-0002-000000000006', NULL, 'culture_values', 'Cultura & Valores', 
 'Vivência dos valores no dia a dia',
 '00000000-0000-0000-0001-000000000005', false, 6, true, true),

-- 7. Relacionamento com líder
('00000000-0000-0000-0002-000000000007', NULL, 'leader_relationship', 'Relacionamento com Líder', 
 'Qualidade da relação com a liderança direta',
 '00000000-0000-0000-0001-000000000001', false, 7, true, true),

-- 8. Relacionamento com time
('00000000-0000-0000-0002-000000000008', NULL, 'team_relationship', 'Relacionamento com Time', 
 'Colaboração e conexão com colegas',
 '00000000-0000-0000-0001-000000000001', false, 8, true, true),

-- 9. Reconhecimento
('00000000-0000-0000-0002-000000000009', NULL, 'recognition', 'Reconhecimento', 
 'Sentir-se valorizado pelo trabalho realizado',
 '00000000-0000-0000-0001-000000000001', false, 9, true, true),

-- 10. Desenvolvimento profissional
('00000000-0000-0000-0002-000000000010', NULL, 'professional_growth', 'Desenvolvimento', 
 'Oportunidades de crescimento e aprendizado',
 '00000000-0000-0000-0001-000000000001', false, 10, true, true),

-- 11. Autonomia
('00000000-0000-0000-0002-000000000011', NULL, 'autonomy', 'Autonomia', 
 'Liberdade para tomar decisões e agir',
 '00000000-0000-0000-0001-000000000001', false, 11, true, true),

-- 12. Ambiente de trabalho
('00000000-0000-0000-0002-000000000012', NULL, 'work_environment', 'Ambiente de Trabalho', 
 'Condições físicas e psicológicas do ambiente',
 '00000000-0000-0000-0001-000000000001', true, 12, true, true);

-- =====================================================
-- DADOS INICIAIS: PILARES (5 macro pilares)
-- =====================================================

INSERT INTO public.pulse_pillars (id, account_id, key, name, description, emoji, color, sort_order, is_active, is_default) VALUES
-- 1. Saúde & Bem-estar
('00000000-0000-0000-0003-000000000001', NULL, 'health_wellbeing', 'Saúde & Bem-estar', 
 'Energia, disposição e equilíbrio no trabalho',
 '💚', 'emerald', 1, true, true),

-- 2. Cultura & Propósito
('00000000-0000-0000-0003-000000000002', NULL, 'culture_purpose', 'Cultura & Propósito', 
 'Valores vividos e conexão com o significado',
 '🧬', 'purple', 2, true, true),

-- 3. Clareza & Direção
('00000000-0000-0000-0003-000000000003', NULL, 'clarity_direction', 'Clareza & Direção', 
 'Expectativas claras e visão do futuro',
 '🎯', 'blue', 3, true, true),

-- 4. Relações & Liderança
('00000000-0000-0000-0003-000000000004', NULL, 'relationships_leadership', 'Relações & Liderança', 
 'Conexão com time e qualidade da liderança',
 '🤝', 'amber', 4, true, true),

-- 5. Execução & Autonomia
('00000000-0000-0000-0003-000000000005', NULL, 'execution_autonomy', 'Execução & Autonomia', 
 'Liberdade para agir e reconhecimento',
 '🚀', 'rose', 5, true, true);

-- =====================================================
-- DADOS INICIAIS: MAPEAMENTO PILAR <-> DRIVER
-- =====================================================

INSERT INTO public.pulse_pillar_driver_map (account_id, pillar_id, driver_id, is_default) VALUES
-- Saúde & Bem-estar
(NULL, '00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0002-000000000001', true), -- mood_energy
(NULL, '00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0002-000000000002', true), -- workload
(NULL, '00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0002-000000000012', true), -- work_environment

-- Cultura & Propósito
(NULL, '00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0002-000000000005', true), -- purpose
(NULL, '00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0002-000000000006', true), -- culture_values

-- Clareza & Direção
(NULL, '00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0002-000000000003', true), -- clarity_expectations
(NULL, '00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0002-000000000004', true), -- company_direction

-- Relações & Liderança
(NULL, '00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0002-000000000007', true), -- leader_relationship
(NULL, '00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0002-000000000008', true), -- team_relationship

-- Execução & Autonomia
(NULL, '00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0002-000000000009', true), -- recognition
(NULL, '00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0002-000000000010', true), -- professional_growth
(NULL, '00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0002-000000000011', true); -- autonomy

-- =====================================================
-- DADOS INICIAIS: REGRAS DE GAMIFICAÇÃO (15+ eventos)
-- =====================================================

INSERT INTO public.pulse_gamification_rules (account_id, event_key, name, description, points, is_active, is_default) VALUES
-- Colaborador
(NULL, 'daily_response', 'Resposta Diária', 'Respondeu o pulso do dia', 10, true, true),
(NULL, 'streak_7_days', 'Sequência 7 Dias', 'Manteve streak de 7 dias', 50, true, true),
(NULL, 'streak_14_days', 'Sequência 14 Dias', 'Manteve streak de 14 dias', 100, true, true),
(NULL, 'streak_30_days', 'Sequência 30 Dias', 'Manteve streak de 30 dias', 250, true, true),
(NULL, 'first_response', 'Primeira Resposta', 'Respondeu o primeiro pulso', 25, true, true),

-- Líder
(NULL, 'leader_weekly_review', 'Revisão Semanal', 'Líder revisou dashboard semanal', 25, true, true),
(NULL, 'team_participation_up', 'Participação Aumentou', 'Time aumentou participação', 50, true, true),
(NULL, 'pillar_improved', 'Pilar Melhorou', 'Pilar crítico do time melhorou', 100, true, true),
(NULL, 'team_aligned', 'Time Alinhado', 'Time com alta clareza (>8)', 75, true, true),
(NULL, 'team_energized', 'Time Energizado', 'Time com saúde alta (>8)', 75, true, true),

-- RH/Admin
(NULL, 'fortnightly_analysis', 'Análise Quinzenal', 'RH fez análise quinzenal', 50, true, true),
(NULL, 'monthly_debrief', 'Devolutiva Mensal', 'RH publicou devolutiva mensal', 100, true, true),
(NULL, 'action_created', 'Ação Criada', 'Criou ação de melhoria', 20, true, true),
(NULL, 'action_completed', 'Ação Concluída', 'Concluiu ação de melhoria', 30, true, true),
(NULL, 'red_to_green', 'Virada Cultural', 'Pilar saiu do vermelho para verde', 150, true, true),
(NULL, 'full_participation', 'Participação Total', '100% do time respondeu no dia', 100, true, true);

-- =====================================================
-- DADOS INICIAIS: BADGES (15+ badges)
-- =====================================================

INSERT INTO public.pulse_badges (id, account_id, key, name, description, icon_emoji, tier, category, criteria, points_reward, is_active, is_default, sort_order) VALUES
-- Streaks (Colaborador)
('00000000-0000-0000-0004-000000000001', NULL, 'streak_7', 'Consistência 7 Dias', 
 'Respondeu o pulso por 7 dias consecutivos', '🔥', 'bronze', 'streak',
 '{"type": "streak", "days": 7}', 50, true, true, 1),

('00000000-0000-0000-0004-000000000002', NULL, 'streak_14', 'Consistência 14 Dias', 
 'Respondeu o pulso por 14 dias consecutivos', '🔥', 'silver', 'streak',
 '{"type": "streak", "days": 14}', 100, true, true, 2),

('00000000-0000-0000-0004-000000000003', NULL, 'streak_30', 'Consistência 30 Dias', 
 'Respondeu o pulso por 30 dias consecutivos', '🔥', 'gold', 'streak',
 '{"type": "streak", "days": 30}', 250, true, true, 3),

('00000000-0000-0000-0004-000000000004', NULL, 'streak_90', 'Guardião do Pulso', 
 'Respondeu o pulso por 90 dias consecutivos', '🛡️', 'platinum', 'streak',
 '{"type": "streak", "days": 90}', 500, true, true, 4),

-- Liderança
('00000000-0000-0000-0004-000000000005', NULL, 'leader_present', 'Líder Presente', 
 'Time com alta adesão por 30 dias', '🤝', 'silver', 'leadership',
 '{"type": "team_participation", "rate": 80, "days": 30}', 150, true, true, 5),

('00000000-0000-0000-0004-000000000006', NULL, 'team_energized', 'Time Energizado', 
 'Pilar Saúde >8 por 30 dias', '🔋', 'gold', 'leadership',
 '{"type": "pillar_score", "pillar": "health_wellbeing", "min_score": 8, "days": 30}', 200, true, true, 6),

('00000000-0000-0000-0004-000000000007', NULL, 'team_aligned', 'Time Alinhado', 
 'Pilar Clareza >8 por 30 dias', '🎯', 'gold', 'leadership',
 '{"type": "pillar_score", "pillar": "clarity_direction", "min_score": 8, "days": 30}', 200, true, true, 7),

('00000000-0000-0000-0004-000000000008', NULL, 'culture_ambassador', 'Embaixador da Cultura', 
 'Pilar Cultura >8 por 30 dias', '🧬', 'platinum', 'culture',
 '{"type": "pillar_score", "pillar": "culture_purpose", "min_score": 8, "days": 30}', 300, true, true, 8),

-- RH/Admin
('00000000-0000-0000-0004-000000000009', NULL, 'data_driven', 'Data-Driven RH', 
 'Uso constante de dashboards (30 acessos)', '📊', 'silver', 'participation',
 '{"type": "dashboard_views", "count": 30}', 100, true, true, 9),

('00000000-0000-0000-0004-000000000010', NULL, 'film_reader', 'Leitor do Filme', 
 'Completou 3 análises quinzenais', '🎬', 'silver', 'participation',
 '{"type": "fortnightly_analyses", "count": 3}', 150, true, true, 10),

('00000000-0000-0000-0004-000000000011', NULL, 'culture_master', 'Mestre da Cultura', 
 'Todos pilares verdes por 30 dias', '🏆', 'gold', 'culture',
 '{"type": "all_pillars_green", "days": 30}', 500, true, true, 11),

('00000000-0000-0000-0004-000000000012', NULL, 'turnaround', 'Virada Cultural', 
 'Pilar saiu do vermelho para verde', '🔥', 'gold', 'improvement',
 '{"type": "pillar_recovery", "from": "red", "to": "green"}', 300, true, true, 12),

-- Participação
('00000000-0000-0000-0004-000000000013', NULL, 'first_pulse', 'Primeiro Pulso', 
 'Respondeu o primeiro pulso', '👋', 'bronze', 'participation',
 '{"type": "first_response"}', 25, true, true, 13),

('00000000-0000-0000-0004-000000000014', NULL, 'century', 'Centenário', 
 '100 respostas totais', '💯', 'silver', 'participation',
 '{"type": "total_responses", "count": 100}', 200, true, true, 14),

('00000000-0000-0000-0004-000000000015', NULL, 'pulse_veteran', 'Veterano do Pulso', 
 '365 respostas totais', '🎖️', 'platinum', 'participation',
 '{"type": "total_responses", "count": 365}', 500, true, true, 15);

-- =====================================================
-- DADOS INICIAIS: NÍVEIS (5 níveis)
-- =====================================================

INSERT INTO public.pulse_levels (account_id, level_number, name, description, min_points, icon_emoji, perks, is_default) VALUES
(NULL, 1, 'Iniciante da Cultura', 'Começando a jornada do pulso', 0, '🌱', 
 '["Acesso ao pulso diário", "Visualização do próprio streak"]', true),

(NULL, 2, 'Protetor do Clima', 'Contribuindo para o clima organizacional', 100, '🌤️', 
 '["Acesso ao histórico pessoal", "Comparação com média do time"]', true),

(NULL, 3, 'Líder de Engajamento', 'Engajado e influenciando positivamente', 300, '⭐', 
 '["Acesso a insights pessoais", "Badge especial no perfil"]', true),

(NULL, 4, 'Arquiteto da Cultura', 'Construindo uma cultura forte', 600, '🏗️', 
 '["Acesso a tendências avançadas", "Comparativo histórico"]', true),

(NULL, 5, 'Guardião EP+', 'Referência em engajamento e cultura', 1000, '👑', 
 '["Acesso completo a insights", "Badge exclusivo", "Reconhecimento público"]', true);
