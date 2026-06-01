-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Company members can view candidate profiles for their interviews" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Company members can view candidate user profiles" ON public.profiles;

-- Create a security definer function to check if user is a company member for a candidate profile
CREATE OR REPLACE FUNCTION public.is_company_member_for_candidate(candidate_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM culture_interview_sessions cis
    INNER JOIN account_members am ON am.account_id = cis.account_id
    WHERE cis.candidate_profile_id = candidate_profile_id
      AND am.user_id = auth.uid() 
      AND am.is_active = true
  )
$$;

-- Create a security definer function to check if a user profile belongs to a candidate in company's interviews
CREATE OR REPLACE FUNCTION public.is_candidate_user_for_company(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM candidate_profiles cp
    INNER JOIN culture_interview_sessions cis ON cis.candidate_profile_id = cp.id
    INNER JOIN account_members am ON am.account_id = cis.account_id
    WHERE cp.user_id = profile_user_id
      AND am.user_id = auth.uid() 
      AND am.is_active = true
  )
$$;

-- Recreate policies using the security definer functions
CREATE POLICY "Company members can view candidate profiles for their interviews"
ON public.candidate_profiles
FOR SELECT
USING (
  auth.uid() = user_id OR public.is_company_member_for_candidate(id)
);

CREATE POLICY "Company members can view candidate user profiles"
ON public.profiles
FOR SELECT
USING (
  public.is_candidate_user_for_company(id)
);