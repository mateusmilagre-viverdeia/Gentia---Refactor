-- Remove a política que causa recursão infinita
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;

-- Remove a política antiga simples (vamos substituir por uma combinada)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Cria política combinada usando a função SECURITY DEFINER (não causa recursão)
CREATE POLICY "Users can view own roles or super admins can view all"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.is_super_admin(auth.uid())
);

-- Garante que as outras políticas também usem funções SECURITY DEFINER
DROP POLICY IF EXISTS "Super admins and head_cs can manage roles" ON public.user_roles;

CREATE POLICY "Authorized users can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid()) 
  OR public.is_head_cs(auth.uid())
)
WITH CHECK (
  public.is_super_admin(auth.uid()) 
  OR public.is_head_cs(auth.uid())
);