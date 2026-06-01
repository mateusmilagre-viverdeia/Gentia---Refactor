DROP POLICY "Users can view disc sessions for their account" ON candidate_disc_sessions;

CREATE POLICY "Users can view disc sessions for their account" 
  ON candidate_disc_sessions FOR SELECT USING (
    is_account_member(auth.uid(), account_id)
    OR can_edit_client_project(auth.uid(), account_id)
    OR is_super_admin(auth.uid())
    OR candidate_profile_id IN (
      SELECT id FROM candidate_profiles 
      WHERE user_id = auth.uid()
    )
  );