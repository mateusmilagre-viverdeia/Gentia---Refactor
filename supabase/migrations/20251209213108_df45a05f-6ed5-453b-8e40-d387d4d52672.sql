-- Fase 1: Adicionar coluna account_id às tabelas de sessão/dados

-- mission_sessions
ALTER TABLE public.mission_sessions 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- vision_sessions
ALTER TABLE public.vision_sessions 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- values_sessions
ALTER TABLE public.values_sessions 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- energy_sessions
ALTER TABLE public.energy_sessions 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- development_sessions
ALTER TABLE public.development_sessions 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- decision_sessions
ALTER TABLE public.decision_sessions 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- event_sessions
ALTER TABLE public.event_sessions 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- ritual_sessions
ALTER TABLE public.ritual_sessions 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- strategic_indicators
ALTER TABLE public.strategic_indicators 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- strategic_projects
ALTER TABLE public.strategic_projects 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- action_plans
ALTER TABLE public.action_plans 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Fase 2: Migrar dados existentes - vincular ao account_id do usuário via profile
UPDATE public.mission_sessions ms SET account_id = p.account_id FROM public.profiles p WHERE ms.user_id = p.id AND p.account_id IS NOT NULL AND ms.account_id IS NULL;
UPDATE public.vision_sessions vs SET account_id = p.account_id FROM public.profiles p WHERE vs.user_id = p.id AND p.account_id IS NOT NULL AND vs.account_id IS NULL;
UPDATE public.values_sessions vs SET account_id = p.account_id FROM public.profiles p WHERE vs.user_id = p.id AND p.account_id IS NOT NULL AND vs.account_id IS NULL;
UPDATE public.energy_sessions es SET account_id = p.account_id FROM public.profiles p WHERE es.user_id = p.id AND p.account_id IS NOT NULL AND es.account_id IS NULL;
UPDATE public.development_sessions ds SET account_id = p.account_id FROM public.profiles p WHERE ds.user_id = p.id AND p.account_id IS NOT NULL AND ds.account_id IS NULL;
UPDATE public.decision_sessions ds SET account_id = p.account_id FROM public.profiles p WHERE ds.user_id = p.id AND p.account_id IS NOT NULL AND ds.account_id IS NULL;
UPDATE public.event_sessions es SET account_id = p.account_id FROM public.profiles p WHERE es.user_id = p.id AND p.account_id IS NOT NULL AND es.account_id IS NULL;
UPDATE public.ritual_sessions rs SET account_id = p.account_id FROM public.profiles p WHERE rs.user_id = p.id AND p.account_id IS NOT NULL AND rs.account_id IS NULL;
UPDATE public.strategic_indicators si SET account_id = p.account_id FROM public.profiles p WHERE si.user_id = p.id AND p.account_id IS NOT NULL AND si.account_id IS NULL;
UPDATE public.strategic_projects sp SET account_id = p.account_id FROM public.profiles p WHERE sp.user_id = p.id AND p.account_id IS NOT NULL AND sp.account_id IS NULL;
UPDATE public.action_plans ap SET account_id = p.account_id FROM public.profiles p WHERE ap.user_id = p.id AND p.account_id IS NOT NULL AND ap.account_id IS NULL;

-- Fase 3: Atualizar RLS policies para usar account_id

-- mission_sessions
DROP POLICY IF EXISTS "Users can create own mission sessions" ON public.mission_sessions;
DROP POLICY IF EXISTS "Users can delete own mission sessions" ON public.mission_sessions;
DROP POLICY IF EXISTS "Users can update own mission sessions" ON public.mission_sessions;
DROP POLICY IF EXISTS "Users can view own mission sessions" ON public.mission_sessions;

CREATE POLICY "Members can view account mission sessions" ON public.mission_sessions FOR SELECT USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can create account mission sessions" ON public.mission_sessions FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can update account mission sessions" ON public.mission_sessions FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can delete account mission sessions" ON public.mission_sessions FOR DELETE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());

-- vision_sessions
DROP POLICY IF EXISTS "Users can create own vision sessions" ON public.vision_sessions;
DROP POLICY IF EXISTS "Users can delete own vision sessions" ON public.vision_sessions;
DROP POLICY IF EXISTS "Users can update own vision sessions" ON public.vision_sessions;
DROP POLICY IF EXISTS "Users can view own vision sessions" ON public.vision_sessions;

CREATE POLICY "Members can view account vision sessions" ON public.vision_sessions FOR SELECT USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can create account vision sessions" ON public.vision_sessions FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can update account vision sessions" ON public.vision_sessions FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can delete account vision sessions" ON public.vision_sessions FOR DELETE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());

-- values_sessions
DROP POLICY IF EXISTS "Users can create own sessions" ON public.values_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.values_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.values_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.values_sessions;

CREATE POLICY "Members can view account values sessions" ON public.values_sessions FOR SELECT USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can create account values sessions" ON public.values_sessions FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can update account values sessions" ON public.values_sessions FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can delete account values sessions" ON public.values_sessions FOR DELETE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());

-- energy_sessions
DROP POLICY IF EXISTS "Users can create own sessions" ON public.energy_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.energy_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.energy_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.energy_sessions;

CREATE POLICY "Members can view account energy sessions" ON public.energy_sessions FOR SELECT USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can create account energy sessions" ON public.energy_sessions FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can update account energy sessions" ON public.energy_sessions FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can delete account energy sessions" ON public.energy_sessions FOR DELETE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());

-- development_sessions
DROP POLICY IF EXISTS "Users can create own sessions" ON public.development_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.development_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.development_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.development_sessions;

CREATE POLICY "Members can view account development sessions" ON public.development_sessions FOR SELECT USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can create account development sessions" ON public.development_sessions FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can update account development sessions" ON public.development_sessions FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can delete account development sessions" ON public.development_sessions FOR DELETE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());

-- decision_sessions
DROP POLICY IF EXISTS "Users can create own sessions" ON public.decision_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.decision_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.decision_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.decision_sessions;

CREATE POLICY "Members can view account decision sessions" ON public.decision_sessions FOR SELECT USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can create account decision sessions" ON public.decision_sessions FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can update account decision sessions" ON public.decision_sessions FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can delete account decision sessions" ON public.decision_sessions FOR DELETE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());

-- event_sessions
DROP POLICY IF EXISTS "Users can create own sessions" ON public.event_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.event_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.event_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.event_sessions;

CREATE POLICY "Members can view account event sessions" ON public.event_sessions FOR SELECT USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can create account event sessions" ON public.event_sessions FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can update account event sessions" ON public.event_sessions FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can delete account event sessions" ON public.event_sessions FOR DELETE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());

-- ritual_sessions
DROP POLICY IF EXISTS "Users can create own sessions" ON public.ritual_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.ritual_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.ritual_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.ritual_sessions;

CREATE POLICY "Members can view account ritual sessions" ON public.ritual_sessions FOR SELECT USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can create account ritual sessions" ON public.ritual_sessions FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can update account ritual sessions" ON public.ritual_sessions FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can delete account ritual sessions" ON public.ritual_sessions FOR DELETE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());

-- strategic_indicators
DROP POLICY IF EXISTS "Users can create own indicators" ON public.strategic_indicators;
DROP POLICY IF EXISTS "Users can delete own indicators" ON public.strategic_indicators;
DROP POLICY IF EXISTS "Users can update own indicators" ON public.strategic_indicators;
DROP POLICY IF EXISTS "Users can view own indicators" ON public.strategic_indicators;

CREATE POLICY "Members can view account indicators" ON public.strategic_indicators FOR SELECT USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can create account indicators" ON public.strategic_indicators FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can update account indicators" ON public.strategic_indicators FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can delete account indicators" ON public.strategic_indicators FOR DELETE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());

-- strategic_projects
DROP POLICY IF EXISTS "Users can create own projects" ON public.strategic_projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.strategic_projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.strategic_projects;
DROP POLICY IF EXISTS "Users can view own projects" ON public.strategic_projects;

CREATE POLICY "Members can view account projects" ON public.strategic_projects FOR SELECT USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can create account projects" ON public.strategic_projects FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can update account projects" ON public.strategic_projects FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can delete account projects" ON public.strategic_projects FOR DELETE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());

-- action_plans
DROP POLICY IF EXISTS "Users can create own actions" ON public.action_plans;
DROP POLICY IF EXISTS "Users can delete own actions" ON public.action_plans;
DROP POLICY IF EXISTS "Users can update own actions" ON public.action_plans;
DROP POLICY IF EXISTS "Users can view own actions" ON public.action_plans;

CREATE POLICY "Members can view account actions" ON public.action_plans FOR SELECT USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can create account actions" ON public.action_plans FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can update account actions" ON public.action_plans FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());
CREATE POLICY "Members can delete account actions" ON public.action_plans FOR DELETE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_mission_sessions_account_id ON public.mission_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_vision_sessions_account_id ON public.vision_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_values_sessions_account_id ON public.values_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_energy_sessions_account_id ON public.energy_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_development_sessions_account_id ON public.development_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_decision_sessions_account_id ON public.decision_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_event_sessions_account_id ON public.event_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_ritual_sessions_account_id ON public.ritual_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_strategic_indicators_account_id ON public.strategic_indicators(account_id);
CREATE INDEX IF NOT EXISTS idx_strategic_projects_account_id ON public.strategic_projects(account_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_account_id ON public.action_plans(account_id);