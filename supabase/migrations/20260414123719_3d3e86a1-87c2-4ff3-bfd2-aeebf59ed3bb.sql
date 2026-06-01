
-- Update SELECT policy to include consultant access
DROP POLICY IF EXISTS "Users can view invites for their email or managed accounts" ON public.account_invites;
CREATE POLICY "Users can view invites for their email or managed accounts"
  ON public.account_invites FOR SELECT
  USING (
    (email = (SELECT p.email FROM profiles p WHERE p.id = auth.uid()))
    OR can_manage_account(auth.uid(), account_id)
    OR is_account_member(auth.uid(), account_id)
    OR can_edit_client_project(auth.uid(), account_id)
  );

-- Update INSERT policy to include consultant access
DROP POLICY IF EXISTS "Admins can create invites" ON public.account_invites;
CREATE POLICY "Admins and consultants can create invites"
  ON public.account_invites FOR INSERT
  WITH CHECK (
    can_manage_account(auth.uid(), account_id)
    OR can_edit_client_project(auth.uid(), account_id)
  );

-- Update DELETE policy to include consultant access
DROP POLICY IF EXISTS "Admins can delete invites" ON public.account_invites;
CREATE POLICY "Admins and consultants can delete invites"
  ON public.account_invites FOR DELETE
  USING (
    can_manage_account(auth.uid(), account_id)
    OR can_edit_client_project(auth.uid(), account_id)
  );
