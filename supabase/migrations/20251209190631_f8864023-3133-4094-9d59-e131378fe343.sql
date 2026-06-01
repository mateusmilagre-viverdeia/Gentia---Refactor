-- 1. Sync existing company owners to account_members
INSERT INTO account_members (account_id, user_id, role)
SELECT c.id, c.user_id, 'owner'::account_role
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM account_members am 
  WHERE am.account_id = c.id AND am.user_id = c.user_id
);

-- 2. Update can_manage_account function to also check companies.user_id as fallback
CREATE OR REPLACE FUNCTION public.can_manage_account(_user_id uuid, _account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM account_members
    WHERE user_id = _user_id 
    AND account_id = _account_id
    AND role IN ('owner', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM companies
    WHERE id = _account_id 
    AND user_id = _user_id
  )
$$;