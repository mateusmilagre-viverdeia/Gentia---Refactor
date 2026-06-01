
-- Fix job_descriptions RLS policies to include consultants
DROP POLICY IF EXISTS "Users can view job descriptions from their account" ON job_descriptions;
CREATE POLICY "Users can view job descriptions from their account" ON job_descriptions
  FOR SELECT USING (
    account_id IN (SELECT account_id FROM account_members WHERE user_id = auth.uid())
    OR can_edit_client_project(auth.uid(), account_id)
  );

DROP POLICY IF EXISTS "Users can create job descriptions for their account" ON job_descriptions;
CREATE POLICY "Users can create job descriptions for their account" ON job_descriptions
  FOR INSERT WITH CHECK (
    account_id IN (SELECT account_id FROM account_members WHERE user_id = auth.uid())
    OR can_edit_client_project(auth.uid(), account_id)
  );

DROP POLICY IF EXISTS "Users can update job descriptions from their account" ON job_descriptions;
CREATE POLICY "Users can update job descriptions from their account" ON job_descriptions
  FOR UPDATE USING (
    account_id IN (SELECT account_id FROM account_members WHERE user_id = auth.uid())
    OR can_edit_client_project(auth.uid(), account_id)
  );

DROP POLICY IF EXISTS "Users can delete job descriptions from their account" ON job_descriptions;
CREATE POLICY "Users can delete job descriptions from their account" ON job_descriptions
  FOR DELETE USING (
    account_id IN (SELECT account_id FROM account_members WHERE user_id = auth.uid())
    OR can_edit_client_project(auth.uid(), account_id)
  );

-- Fix recruitment_jobs RLS policy to include consultants
DROP POLICY IF EXISTS "Members can manage jobs" ON recruitment_jobs;
CREATE POLICY "Members can manage jobs" ON recruitment_jobs
  FOR ALL USING (
    account_id IN (SELECT account_id FROM account_members WHERE user_id = auth.uid())
    OR can_edit_client_project(auth.uid(), account_id)
  );
