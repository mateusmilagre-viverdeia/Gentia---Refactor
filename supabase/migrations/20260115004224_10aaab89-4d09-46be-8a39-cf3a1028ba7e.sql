-- Drop existing policies on partner_direct_sales
DROP POLICY IF EXISTS "Super admins and head_cs can manage direct sales" ON public.partner_direct_sales;
DROP POLICY IF EXISTS "EP Partners can view their own direct sales" ON public.partner_direct_sales;

-- Recreate policies with 'authenticated' role for consistency
CREATE POLICY "Super admins and head_cs can manage direct sales"
ON public.partner_direct_sales
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'head_cs')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'head_cs')
  )
);

CREATE POLICY "EP Partners can view their own direct sales"
ON public.partner_direct_sales
FOR SELECT
TO authenticated
USING (
  partner_id IN (
    SELECT id FROM public.ep_partners
    WHERE user_id = auth.uid()
  )
);