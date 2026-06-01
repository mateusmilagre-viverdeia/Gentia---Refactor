DROP POLICY IF EXISTS "Account members can view interview responses" ON public.culture_interview_responses;
DROP POLICY IF EXISTS "Account members can update interview responses" ON public.culture_interview_responses;

CREATE POLICY "Account members or consultants can view interview responses"
ON public.culture_interview_responses FOR SELECT
USING (EXISTS (
  SELECT 1 FROM culture_interview_sessions cis
  WHERE cis.id = culture_interview_responses.session_id
    AND (is_account_member(auth.uid(), cis.account_id) OR can_edit_client_project(auth.uid(), cis.account_id))
));

CREATE POLICY "Account members or consultants can update interview responses"
ON public.culture_interview_responses FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM culture_interview_sessions cis
  WHERE cis.id = culture_interview_responses.session_id
    AND (is_account_member(auth.uid(), cis.account_id) OR can_edit_client_project(auth.uid(), cis.account_id))
));