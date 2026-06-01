-- Add policy to allow anyone to view pending invites by id
-- This enables the invite acceptance flow for unauthenticated users
CREATE POLICY "Anyone can view pending invites by id" 
ON public.account_invites
FOR SELECT
USING (
  accepted = false 
  AND expires_at > now()
);