
-- =====================================================
-- CORREÇÃO DE PERMISSÕES DO ROLE MEMBRO
-- =====================================================

-- 1. Criar função helper para verificar se é admin ou leader
CREATE OR REPLACE FUNCTION public.is_pulse_admin_or_leader(_user_id uuid, _account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.user_id = _user_id
    AND am.account_id = _account_id
    AND am.role IN ('owner', 'admin', 'admin_rh', 'leader')
  )
$$;

-- 2. Atualizar função de permissões padrão por role
CREATE OR REPLACE FUNCTION public.get_default_permissions_for_role(p_role public.account_role)
RETURNS TABLE (
  module_slug TEXT,
  can_view BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.slug,
    -- VISUALIZAÇÃO
    CASE 
      -- Viewer não vê módulos de conta (exceto empresa)
      WHEN p_role = 'viewer' AND m.category = 'conta' AND m.slug != 'conta_empresa' THEN FALSE
      -- MEMBRO não vê usuários nem permissões
      WHEN p_role = 'member' AND m.slug IN ('conta_usuarios', 'conta_permissoes') THEN FALSE
      ELSE TRUE
    END,
    -- CRIAR
    CASE 
      WHEN p_role IN ('owner', 'admin') THEN TRUE
      WHEN p_role = 'admin_rh' AND m.category IN ('cultura', 'atracao', 'contratacao', 'retencao') THEN TRUE
      WHEN p_role = 'leader' AND m.category = 'retencao' AND m.slug IN ('retencao_pulse', 'retencao_disc') THEN TRUE
      -- MEMBRO não pode criar nada
      ELSE FALSE
    END,
    -- EDITAR
    CASE 
      WHEN p_role IN ('owner', 'admin') THEN TRUE
      WHEN p_role = 'admin_rh' AND m.category IN ('cultura', 'atracao', 'contratacao', 'retencao') THEN TRUE
      WHEN p_role = 'leader' AND m.category = 'retencao' AND m.slug IN ('retencao_pulse', 'retencao_disc') THEN TRUE
      -- MEMBRO não pode editar nada (removido acesso a Pulse/DISC)
      ELSE FALSE
    END,
    -- DELETAR
    CASE 
      WHEN p_role IN ('owner', 'admin') THEN TRUE
      WHEN p_role = 'admin_rh' AND m.category IN ('retencao') THEN TRUE
      ELSE FALSE
    END
  FROM public.modules m
  ORDER BY m.sort_order;
END;
$$;

-- =====================================================
-- 3. RESTRINGIR POLÍTICAS RLS DO PULSE
-- =====================================================

-- Remover policies permissivas para membros
DROP POLICY IF EXISTS "Members can view account profiles" ON public.pulse_user_profiles;
DROP POLICY IF EXISTS "Members can view account badges" ON public.pulse_user_badges;

-- Novas policies para pulse_user_profiles (apenas admins/leaders veem todos)
CREATE POLICY "Admins and leaders can view account profiles" 
ON public.pulse_user_profiles FOR SELECT
USING (
  user_id = auth.uid() 
  OR is_pulse_admin_or_leader(auth.uid(), account_id)
);

-- Novas policies para pulse_user_badges (apenas admins/leaders veem todos)
CREATE POLICY "Admins and leaders can view account badges"
ON public.pulse_user_badges FOR SELECT
USING (
  user_id = auth.uid() 
  OR is_pulse_admin_or_leader(auth.uid(), account_id)
);

-- =====================================================
-- 4. RESTRINGIR POLÍTICAS RLS DO DISC
-- =====================================================

-- Remover policy permissiva de sessões DISC
DROP POLICY IF EXISTS "Account members can view DISC sessions" ON public.disc_sessions;

-- Nova policy: Apenas ver sessões onde é participante OU é admin/leader
CREATE POLICY "Users can view their own DISC sessions or as admin"
ON public.disc_sessions FOR SELECT
USING (
  user_id = auth.uid()
  OR is_pulse_admin_or_leader(auth.uid(), account_id)
);

-- Atualizar policies de disc_responses para consistência
DROP POLICY IF EXISTS "Users can manage responses for their sessions" ON public.disc_responses;
DROP POLICY IF EXISTS "Users can insert responses for their sessions" ON public.disc_responses;
DROP POLICY IF EXISTS "Users can view responses for their sessions" ON public.disc_responses;

CREATE POLICY "Users can view responses for their sessions"
ON public.disc_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM disc_sessions ds
    WHERE ds.id = disc_responses.session_id
    AND (ds.user_id = auth.uid() OR is_pulse_admin_or_leader(auth.uid(), ds.account_id))
  )
);

CREATE POLICY "Users can insert responses for their sessions"
ON public.disc_responses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM disc_sessions ds
    WHERE ds.id = disc_responses.session_id
    AND ds.user_id = auth.uid()
  )
);

-- Atualizar policies de disc_results para consistência
DROP POLICY IF EXISTS "Users can view results for their sessions" ON public.disc_results;
DROP POLICY IF EXISTS "Account members can view DISC results" ON public.disc_results;

CREATE POLICY "Users can view results for their sessions"
ON public.disc_results FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM disc_sessions ds
    WHERE ds.id = disc_results.session_id
    AND (ds.user_id = auth.uid() OR is_pulse_admin_or_leader(auth.uid(), ds.account_id))
  )
);
