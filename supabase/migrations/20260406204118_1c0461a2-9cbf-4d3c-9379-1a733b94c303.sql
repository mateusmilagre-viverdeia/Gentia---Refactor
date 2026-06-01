-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Account members can view technical sessions" ON technical_interview_sessions;
DROP POLICY IF EXISTS "Account members can manage technical sessions" ON technical_interview_sessions;

-- Recreate with full access (same pattern as culture_interview_sessions)
CREATE POLICY "Members and consultants can view technical sessions"
  ON technical_interview_sessions FOR SELECT
  USING (
    is_account_member(auth.uid(), account_id)
    OR can_edit_client_project(auth.uid(), account_id)
    OR is_super_admin(auth.uid())
    OR candidate_profile_id IN (
      SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members and consultants can manage technical sessions"
  ON technical_interview_sessions FOR ALL
  USING (
    is_account_member(auth.uid(), account_id)
    OR can_edit_client_project(auth.uid(), account_id)
    OR is_super_admin(auth.uid())
  );