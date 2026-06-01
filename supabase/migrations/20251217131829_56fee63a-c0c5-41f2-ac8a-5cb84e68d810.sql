-- =====================================================
-- FASE 3: ATUALIZAR RLS EXISTENTES PARA INCLUIR CONSULTORES
-- =====================================================

-- Mission Sessions - Add UPDATE policy for EP Team
DROP POLICY IF EXISTS "Members can update account mission sessions" ON public.mission_sessions;
CREATE POLICY "Members can update account mission sessions"
ON public.mission_sessions FOR UPDATE
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Vision Sessions - Add UPDATE policy for EP Team
DROP POLICY IF EXISTS "Members can update account vision sessions" ON public.vision_sessions;
CREATE POLICY "Members can update account vision sessions"
ON public.vision_sessions FOR UPDATE
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Values Sessions - Add UPDATE policy for EP Team
DROP POLICY IF EXISTS "Members can update account values sessions" ON public.values_sessions;
CREATE POLICY "Members can update account values sessions"
ON public.values_sessions FOR UPDATE
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Energy Sessions - Add UPDATE policy for EP Team
DROP POLICY IF EXISTS "Members can update account energy sessions" ON public.energy_sessions;
CREATE POLICY "Members can update account energy sessions"
ON public.energy_sessions FOR UPDATE
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Development Sessions - Add UPDATE policy for EP Team
DROP POLICY IF EXISTS "Members can update account development sessions" ON public.development_sessions;
CREATE POLICY "Members can update account development sessions"
ON public.development_sessions FOR UPDATE
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Decision Sessions - Add UPDATE policy for EP Team
DROP POLICY IF EXISTS "Members can update account decision sessions" ON public.decision_sessions;
CREATE POLICY "Members can update account decision sessions"
ON public.decision_sessions FOR UPDATE
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Event Sessions - Add UPDATE policy for EP Team
DROP POLICY IF EXISTS "Members can update account event sessions" ON public.event_sessions;
CREATE POLICY "Members can update account event sessions"
ON public.event_sessions FOR UPDATE
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Ritual Sessions - Add UPDATE policy for EP Team
DROP POLICY IF EXISTS "Members can update account ritual sessions" ON public.ritual_sessions;
CREATE POLICY "Members can update account ritual sessions"
ON public.ritual_sessions FOR UPDATE
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Strategic Indicators - Add UPDATE policy for EP Team
DROP POLICY IF EXISTS "Members can update account indicators" ON public.strategic_indicators;
CREATE POLICY "Members can update account indicators"
ON public.strategic_indicators FOR UPDATE
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Strategic Projects - Add UPDATE policy for EP Team
DROP POLICY IF EXISTS "Members can update account projects" ON public.strategic_projects;
CREATE POLICY "Members can update account projects"
ON public.strategic_projects FOR UPDATE
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Action Plans - Add UPDATE policy for EP Team
DROP POLICY IF EXISTS "Members can update account actions" ON public.action_plans;
CREATE POLICY "Members can update account actions"
ON public.action_plans FOR UPDATE
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- =====================================================
-- ADD SELECT POLICIES FOR EP TEAM TO VIEW CLIENT DATA
-- =====================================================

-- Mission Sessions
DROP POLICY IF EXISTS "Members can view account mission sessions" ON public.mission_sessions;
CREATE POLICY "Members can view account mission sessions"
ON public.mission_sessions FOR SELECT
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Vision Sessions
DROP POLICY IF EXISTS "Members can view account vision sessions" ON public.vision_sessions;
CREATE POLICY "Members can view account vision sessions"
ON public.vision_sessions FOR SELECT
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Values Sessions
DROP POLICY IF EXISTS "Members can view account values sessions" ON public.values_sessions;
CREATE POLICY "Members can view account values sessions"
ON public.values_sessions FOR SELECT
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Energy Sessions
DROP POLICY IF EXISTS "Members can view account energy sessions" ON public.energy_sessions;
CREATE POLICY "Members can view account energy sessions"
ON public.energy_sessions FOR SELECT
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Development Sessions
DROP POLICY IF EXISTS "Members can view account development sessions" ON public.development_sessions;
CREATE POLICY "Members can view account development sessions"
ON public.development_sessions FOR SELECT
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Decision Sessions
DROP POLICY IF EXISTS "Members can view account decision sessions" ON public.decision_sessions;
CREATE POLICY "Members can view account decision sessions"
ON public.decision_sessions FOR SELECT
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Event Sessions
DROP POLICY IF EXISTS "Members can view account event sessions" ON public.event_sessions;
CREATE POLICY "Members can view account event sessions"
ON public.event_sessions FOR SELECT
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Ritual Sessions
DROP POLICY IF EXISTS "Members can view account ritual sessions" ON public.ritual_sessions;
CREATE POLICY "Members can view account ritual sessions"
ON public.ritual_sessions FOR SELECT
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Strategic Indicators
DROP POLICY IF EXISTS "Members can view account indicators" ON public.strategic_indicators;
CREATE POLICY "Members can view account indicators"
ON public.strategic_indicators FOR SELECT
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Strategic Projects
DROP POLICY IF EXISTS "Members can view account projects" ON public.strategic_projects;
CREATE POLICY "Members can view account projects"
ON public.strategic_projects FOR SELECT
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Action Plans
DROP POLICY IF EXISTS "Members can view account actions" ON public.action_plans;
CREATE POLICY "Members can view account actions"
ON public.action_plans FOR SELECT
USING (
  is_account_member(auth.uid(), account_id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), account_id)
);

-- Companies - Allow EP Team to view client companies
DROP POLICY IF EXISTS "Members can view their account" ON public.companies;
CREATE POLICY "Members can view their account"
ON public.companies FOR SELECT
USING (
  is_account_member(auth.uid(), id) 
  OR (user_id = auth.uid())
  OR can_edit_client_project(auth.uid(), id)
);