-- Add policy for candidates to view their own applications
CREATE POLICY "Candidates can view their own applications"
ON public.recruitment_applications
FOR SELECT
TO authenticated
USING (
  candidate_id IN (
    SELECT id FROM public.recruitment_candidates 
    WHERE email = public.get_auth_email()
  )
);

-- Add policy for candidates to view their own candidate records
CREATE POLICY "Candidates can view their own record"
ON public.recruitment_candidates
FOR SELECT
TO authenticated
USING (email = public.get_auth_email());