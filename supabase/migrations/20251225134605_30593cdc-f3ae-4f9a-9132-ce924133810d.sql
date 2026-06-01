-- Fix 1: Restrict profile SELECT to own profile OR admins (not all team members)
-- Drop existing permissive policy
DROP POLICY IF EXISTS "Users can view profiles in same account" ON public.profiles;

-- Create restricted policy: users see own profile OR admins/super_admin can see account profiles
CREATE POLICY "Users can view own profile or admins view team"
ON public.profiles FOR SELECT
USING (
  id = auth.uid() 
  OR public.can_manage_account(auth.uid(), account_id)
  OR public.is_super_admin(auth.uid())
  OR public.is_head_cs(auth.uid())
);

-- Fix 2: Add DELETE policy for companies table (owners and super admins only)
CREATE POLICY "Account owners and super admins can delete company"
ON public.companies FOR DELETE
USING (
  user_id = auth.uid() 
  OR public.is_super_admin(auth.uid())
);