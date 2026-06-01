
-- Fix RLS on recruitment_usage_credits
DROP POLICY IF EXISTS "Members can view their org credits" ON public.recruitment_usage_credits;
CREATE POLICY "Members and platform admins can view credits"
  ON public.recruitment_usage_credits
  FOR SELECT
  TO authenticated
  USING (
    is_account_member(auth.uid(), account_id)
    OR can_edit_client_project(auth.uid(), account_id)
    OR is_super_admin(auth.uid())
  );

-- Fix RLS on recruitment_usage_log
DROP POLICY IF EXISTS "Members can view their org usage log" ON public.recruitment_usage_log;
CREATE POLICY "Members and platform admins can view usage log"
  ON public.recruitment_usage_log
  FOR SELECT
  TO authenticated
  USING (
    is_account_member(auth.uid(), account_id)
    OR can_edit_client_project(auth.uid(), account_id)
    OR is_super_admin(auth.uid())
  );
