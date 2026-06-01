CREATE POLICY "Super admins can view all account members"
ON public.account_members
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));