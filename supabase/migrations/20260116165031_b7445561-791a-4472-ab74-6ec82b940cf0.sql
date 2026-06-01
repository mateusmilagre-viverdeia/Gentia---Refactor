-- Corrigir função can_manage_client_licenses para usar user_roles
CREATE OR REPLACE FUNCTION public.can_manage_client_licenses(p_user_id UUID, p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Super admin ou Head CS podem gerenciar qualquer cliente
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p_user_id 
      AND ur.role IN ('super_admin', 'head_cs')
    )
    OR
    -- EP Consultant pode gerenciar apenas clientes atribuídos
    (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_user_id 
        AND ur.role = 'ep_consultant'
      )
      AND EXISTS (
        SELECT 1 FROM public.ep_consultants ec
        JOIN public.consultant_assignments ca ON ca.consultant_id = ec.id
        WHERE ec.user_id = p_user_id
        AND ec.active = true
        AND ca.account_id = p_account_id
        AND ca.active = true
      )
    );
$$;