CREATE POLICY "Super admins can view all seat grants"
ON public.org_seat_grants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'head_cs')
  )
);