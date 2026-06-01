-- Atualizar função is_account_admin_or_owner para incluir role admin_rh
CREATE OR REPLACE FUNCTION public.is_account_admin_or_owner(_user_id uuid, _account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM account_members
    WHERE user_id = _user_id
    AND account_id = _account_id
    AND role IN ('owner', 'admin', 'admin_rh')
  )
$$;