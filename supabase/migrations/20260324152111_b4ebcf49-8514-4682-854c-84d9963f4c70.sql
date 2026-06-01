
-- 1. Backfill account_id on recruitment_applications from recruitment_jobs
UPDATE recruitment_applications ra
SET account_id = rj.account_id
FROM recruitment_jobs rj
WHERE ra.job_id = rj.id
  AND ra.account_id IS NULL;

-- 2. Drop and recreate culture_interview_sessions SELECT policies to include delegated access
DROP POLICY IF EXISTS "Company members can view interview sessions for their company" ON culture_interview_sessions;
DROP POLICY IF EXISTS "Candidates can view their own interview sessions" ON culture_interview_sessions;

CREATE POLICY "Members and admins can view interview sessions"
ON culture_interview_sessions FOR SELECT TO authenticated
USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
  OR is_super_admin(auth.uid())
  OR candidate_profile_id IN (
    SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
  )
);

-- 3. Update UPDATE policy to include delegated access
DROP POLICY IF EXISTS "Company members can update interview sessions" ON culture_interview_sessions;
DROP POLICY IF EXISTS "Candidates can update their own interview sessions" ON culture_interview_sessions;

CREATE POLICY "Members and admins can update interview sessions"
ON culture_interview_sessions FOR UPDATE TO authenticated
USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
  OR is_super_admin(auth.uid())
  OR candidate_profile_id IN (
    SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
  )
);

-- 4. Update DELETE policy to include delegated access
DROP POLICY IF EXISTS "Company members can delete interview sessions" ON culture_interview_sessions;

CREATE POLICY "Members and admins can delete interview sessions"
ON culture_interview_sessions FOR DELETE TO authenticated
USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
  OR is_super_admin(auth.uid())
);
