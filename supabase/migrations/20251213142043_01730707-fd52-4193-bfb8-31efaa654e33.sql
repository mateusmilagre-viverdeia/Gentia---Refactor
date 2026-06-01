-- Remove the overly permissive RLS policy that exposes emails
DROP POLICY IF EXISTS "Anyone can view pending invites by id" ON account_invites;

-- Create a more restrictive policy that only allows authenticated users to see their own invites
CREATE POLICY "Users can view their own invites"
ON account_invites FOR SELECT
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR is_account_member(auth.uid(), account_id)
);

-- Note: The validate-invite edge function uses service role key to access invites securely