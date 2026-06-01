-- Remover a política atual
DROP POLICY IF EXISTS "org_billing_select" ON public.org_billing;

-- Criar nova política que permite qualquer membro ler o status de billing
CREATE POLICY "org_billing_select" ON public.org_billing
FOR SELECT
USING (
  is_super_admin(auth.uid()) 
  OR is_head_cs(auth.uid()) 
  OR is_account_member(auth.uid(), org_id)
);