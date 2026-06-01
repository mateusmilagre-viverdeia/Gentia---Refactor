CREATE POLICY "Super admins and consultants can view disc results"
ON public.candidate_disc_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM candidate_disc_sessions cds
    WHERE cds.id = candidate_disc_results.session_id
    AND can_edit_client_project(auth.uid(), cds.account_id)
  )
);