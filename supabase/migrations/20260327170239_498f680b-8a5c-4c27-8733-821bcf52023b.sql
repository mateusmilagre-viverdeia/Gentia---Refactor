CREATE POLICY "candidates_read_own_applications"
ON public.recruitment_applications
FOR SELECT
TO authenticated
USING (
  candidate_id IN (
    SELECT id FROM public.recruitment_candidates
    WHERE email = auth.email()
  )
);