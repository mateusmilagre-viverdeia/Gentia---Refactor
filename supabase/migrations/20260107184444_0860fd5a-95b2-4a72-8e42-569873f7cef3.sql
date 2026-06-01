-- Corrigir RLS da tabela admin_grants para permitir que usuários vejam grants de suas organizações
-- Isso afeta TODAS as 11 organizações com grants ativos (VOXEL, Highbras, Marcel, etc.)

-- Remover política antiga que só permite super_admin e head_cs
DROP POLICY IF EXISTS "admin_grants_select" ON public.admin_grants;

-- Nova política: 
-- 1. Super admins e head_cs podem ver todos os grants
-- 2. Usuários podem ver grants da sua organização
-- 3. Usuários podem ver grants do seu próprio user_id
CREATE POLICY "admin_grants_select" ON public.admin_grants
  FOR SELECT USING (
    is_super_admin(auth.uid()) 
    OR is_head_cs(auth.uid())
    OR (
      org_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM account_members
        WHERE account_members.account_id = admin_grants.org_id
        AND account_members.user_id = auth.uid()
      )
    )
    OR user_id = auth.uid()
  );