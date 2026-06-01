-- 1. Remover a política problemática que acessa auth.users diretamente
DROP POLICY IF EXISTS "Users can view their own invites" ON account_invites;

-- 2. Remover políticas duplicadas que serão substituídas
DROP POLICY IF EXISTS "Invited users can view their invites" ON account_invites;
DROP POLICY IF EXISTS "Admins can view account invites" ON account_invites;

-- 3. Criar uma política abrangente que usa profiles (não auth.users)
CREATE POLICY "Users can view invites for their email or managed accounts"
ON account_invites
FOR SELECT
TO authenticated
USING (
  -- Usuário pode ver convites para seu próprio email (via profiles)
  email = (SELECT p.email FROM profiles p WHERE p.id = auth.uid())
  OR
  -- Ou pode ver convites de contas que gerencia
  can_manage_account(auth.uid(), account_id)
  OR
  -- Ou é membro da conta
  is_account_member(auth.uid(), account_id)
);