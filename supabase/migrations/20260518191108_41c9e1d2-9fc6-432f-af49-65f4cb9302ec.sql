-- platform_credit_config: permitir UPDATE por super admin / head CS
CREATE POLICY "Super admins can update credit config"
ON public.platform_credit_config
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.is_head_cs(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_head_cs(auth.uid()));

CREATE POLICY "Super admins can insert credit config"
ON public.platform_credit_config
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_head_cs(auth.uid()));

-- recruitment_credit_packages: permitir CRUD por super admin / head CS
CREATE POLICY "Super admins can insert credit packages"
ON public.recruitment_credit_packages
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_head_cs(auth.uid()));

CREATE POLICY "Super admins can update credit packages"
ON public.recruitment_credit_packages
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.is_head_cs(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_head_cs(auth.uid()));

CREATE POLICY "Super admins can delete credit packages"
ON public.recruitment_credit_packages
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.is_head_cs(auth.uid()));

-- Permitir leitura de pacotes inativos para admins (a página precisa ver tudo)
CREATE POLICY "Super admins can view all packages"
ON public.recruitment_credit_packages
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.is_head_cs(auth.uid()));

-- Permitir DELETE em credit_costs (já tem UPDATE)
CREATE POLICY "Super admins can insert credit costs"
ON public.recruitment_credit_costs
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_head_cs(auth.uid()));

CREATE POLICY "Super admins can delete credit costs"
ON public.recruitment_credit_costs
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.is_head_cs(auth.uid()));