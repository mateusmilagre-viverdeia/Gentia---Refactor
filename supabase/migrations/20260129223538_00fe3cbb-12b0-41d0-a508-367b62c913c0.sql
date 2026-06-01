-- Drop existing policy
DROP POLICY IF EXISTS "Users can view own profile or admins view team" ON public.profiles;

-- Create updated policy that includes admin_rh via is_account_admin_or_owner
CREATE POLICY "Users can view own profile or admins view team"
ON public.profiles
FOR SELECT
USING (
  (id = auth.uid())
  OR can_manage_account(auth.uid(), account_id)
  OR is_account_admin_or_owner(auth.uid(), account_id)
  OR is_super_admin(auth.uid())
  OR is_head_cs(auth.uid())
);