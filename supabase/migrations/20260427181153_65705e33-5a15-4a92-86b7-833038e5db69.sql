
-- Estende as políticas de selling_company_versions para suportar Modo Consultoria
-- (consultores EP atribuídos via can_edit_client_project)

DROP POLICY IF EXISTS "Members can view session versions" ON public.selling_company_versions;
DROP POLICY IF EXISTS "Members can create session versions" ON public.selling_company_versions;
DROP POLICY IF EXISTS "Members can update session versions" ON public.selling_company_versions;
DROP POLICY IF EXISTS "Members can delete session versions" ON public.selling_company_versions;

CREATE POLICY "Members can view session versions"
ON public.selling_company_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.selling_company_sessions s
    WHERE s.id = selling_company_versions.session_id
      AND (
        public.is_account_member(auth.uid(), s.account_id)
        OR public.can_edit_client_project(auth.uid(), s.account_id)
      )
  )
);

CREATE POLICY "Members can create session versions"
ON public.selling_company_versions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.selling_company_sessions s
    WHERE s.id = selling_company_versions.session_id
      AND (
        public.is_account_member(auth.uid(), s.account_id)
        OR public.can_edit_client_project(auth.uid(), s.account_id)
      )
  )
);

CREATE POLICY "Members can update session versions"
ON public.selling_company_versions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.selling_company_sessions s
    WHERE s.id = selling_company_versions.session_id
      AND (
        public.is_account_member(auth.uid(), s.account_id)
        OR public.can_edit_client_project(auth.uid(), s.account_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.selling_company_sessions s
    WHERE s.id = selling_company_versions.session_id
      AND (
        public.is_account_member(auth.uid(), s.account_id)
        OR public.can_edit_client_project(auth.uid(), s.account_id)
      )
  )
);

CREATE POLICY "Members can delete session versions"
ON public.selling_company_versions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.selling_company_sessions s
    WHERE s.id = selling_company_versions.session_id
      AND (
        public.is_account_member(auth.uid(), s.account_id)
        OR public.can_edit_client_project(auth.uid(), s.account_id)
      )
  )
);
