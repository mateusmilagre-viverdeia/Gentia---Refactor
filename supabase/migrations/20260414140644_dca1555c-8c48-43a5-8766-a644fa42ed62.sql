
-- Drop the insecure anon policy
DROP POLICY IF EXISTS "Anyone can view valid pending invites" ON public.ep_invites;

-- Create a secure policy: only authenticated users can see their own pending invite (matched by email)
CREATE POLICY "Users can view their own pending invite"
ON public.ep_invites
FOR SELECT
TO authenticated
USING (
  accepted = false
  AND expires_at > now()
  AND email = auth.jwt()->>'email'
);
