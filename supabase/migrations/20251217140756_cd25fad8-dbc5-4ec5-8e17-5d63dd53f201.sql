-- Parte 1: Sincronizar profiles.account_id com account_members para dados existentes
UPDATE profiles p
SET account_id = am.account_id
FROM account_members am
WHERE am.user_id = p.id
AND p.account_id IS NULL;

-- Parte 2: Permitir super_admin e head_cs ver todos os perfis para busca
CREATE POLICY "Super admins and head_cs can view all profiles"
ON public.profiles FOR SELECT
USING (
  public.is_super_admin(auth.uid()) 
  OR public.is_head_cs(auth.uid())
);