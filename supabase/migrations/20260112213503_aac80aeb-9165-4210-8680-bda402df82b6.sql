-- Add RLS policy for company members to view candidate profiles for their job applications
CREATE POLICY "Company members can view candidate profiles for their interviews"
ON public.candidate_profiles
FOR SELECT
USING (
  id IN (
    SELECT cis.candidate_profile_id 
    FROM culture_interview_sessions cis
    WHERE cis.account_id IN (
      SELECT am.account_id 
      FROM account_members am 
      WHERE am.user_id = auth.uid() AND am.is_active = true
    )
  )
);

-- Also allow viewing profiles via the profiles table for candidate emails
-- Add policy for company members to view profiles of candidates who applied to their jobs
CREATE POLICY "Company members can view candidate user profiles"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT cp.user_id 
    FROM candidate_profiles cp
    INNER JOIN culture_interview_sessions cis ON cis.candidate_profile_id = cp.id
    WHERE cis.account_id IN (
      SELECT am.account_id 
      FROM account_members am 
      WHERE am.user_id = auth.uid() AND am.is_active = true
    )
  )
);