-- Drop existing public policy if exists and create a proper one
DROP POLICY IF EXISTS "Public can self-register as candidate" ON public.recruitment_candidates;

-- Allow authenticated users (candidates) to create their own candidate record
CREATE POLICY "Candidates can self-register"
ON public.recruitment_candidates
FOR INSERT
TO authenticated
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));