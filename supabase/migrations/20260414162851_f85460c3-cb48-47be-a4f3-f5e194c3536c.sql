-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Admins can update account members" ON account_members;

-- Create expanded policy including consultant access
CREATE POLICY "Admins and consultants can update account members"
ON account_members FOR UPDATE
USING (
  can_manage_account(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
)
WITH CHECK (
  can_manage_account(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);