DROP POLICY IF EXISTS "Users can insert own roip assessments" ON public.roip_assessments;
DROP POLICY IF EXISTS "Users can delete own roip assessments" ON public.roip_assessments;
DROP POLICY IF EXISTS "Members can update roip assessments" ON public.roip_assessments;

CREATE POLICY "Members can update roip assessments"
ON public.roip_assessments
FOR UPDATE
USING (
  auth.uid() = user_id
  OR public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
)
WITH CHECK (
  auth.uid() = user_id
  OR public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
);