-- Allow account members (recruiters) to view candidate work history
CREATE POLICY "Account members can view candidate work history"
ON public.candidate_work_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM candidate_profiles cp
    JOIN culture_interview_sessions cis ON cis.candidate_profile_id = cp.id
    JOIN account_members am ON am.account_id = cis.account_id
    WHERE cp.id = candidate_work_history.candidate_profile_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
  )
);

-- Allow account members (recruiters) to view candidate education
CREATE POLICY "Account members can view candidate education"
ON public.candidate_education
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM candidate_profiles cp
    JOIN culture_interview_sessions cis ON cis.candidate_profile_id = cp.id
    JOIN account_members am ON am.account_id = cis.account_id
    WHERE cp.id = candidate_education.candidate_profile_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
  )
);