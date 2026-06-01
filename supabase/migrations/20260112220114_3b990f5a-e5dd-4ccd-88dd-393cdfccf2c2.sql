-- Drop the problematic policy
DROP POLICY IF EXISTS "Candidates can self-register" ON public.recruitment_candidates;

-- Create a security definer function to get user email safely
CREATE OR REPLACE FUNCTION public.get_auth_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- Create new policy using the security definer function
CREATE POLICY "Candidates can self-register"
ON public.recruitment_candidates
FOR INSERT
TO authenticated
WITH CHECK (email = public.get_auth_email());