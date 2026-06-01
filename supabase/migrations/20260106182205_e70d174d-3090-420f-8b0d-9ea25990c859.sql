-- Fix RLS inconsistency: UPDATE and DELETE should follow the same logic as SELECT
-- Only the session owner OR admins/leaders can update/delete DISC sessions

-- Drop existing permissive UPDATE policy
DROP POLICY IF EXISTS "Account members can update DISC sessions" ON disc_sessions;

-- Create new UPDATE policy with same logic as SELECT
CREATE POLICY "Users can update their own DISC sessions or as admin"
ON disc_sessions
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  OR is_pulse_admin_or_leader(auth.uid(), account_id)
)
WITH CHECK (
  user_id = auth.uid() 
  OR is_pulse_admin_or_leader(auth.uid(), account_id)
);

-- Drop existing permissive DELETE policy
DROP POLICY IF EXISTS "Account members can delete DISC sessions" ON disc_sessions;

-- Create new DELETE policy with same logic as SELECT
CREATE POLICY "Users can delete their own DISC sessions or as admin"
ON disc_sessions
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() 
  OR is_pulse_admin_or_leader(auth.uid(), account_id)
);