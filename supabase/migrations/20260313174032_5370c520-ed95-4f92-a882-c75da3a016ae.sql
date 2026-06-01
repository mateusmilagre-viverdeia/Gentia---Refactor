
-- Fix RLS policies for job_distribution_credentials to allow all active members

DROP POLICY IF EXISTS "Only admins can view credentials" ON public.job_distribution_credentials;
CREATE POLICY "Members can view credentials"
  ON public.job_distribution_credentials FOR SELECT
  USING (account_id IN (
    SELECT account_id FROM public.account_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

DROP POLICY IF EXISTS "Only admins can insert credentials" ON public.job_distribution_credentials;
CREATE POLICY "Members can insert credentials"
  ON public.job_distribution_credentials FOR INSERT
  WITH CHECK (account_id IN (
    SELECT account_id FROM public.account_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

DROP POLICY IF EXISTS "Only admins can update credentials" ON public.job_distribution_credentials;
CREATE POLICY "Members can update credentials"
  ON public.job_distribution_credentials FOR UPDATE
  USING (account_id IN (
    SELECT account_id FROM public.account_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

DROP POLICY IF EXISTS "Only admins can delete credentials" ON public.job_distribution_credentials;
CREATE POLICY "Members can delete credentials"
  ON public.job_distribution_credentials FOR DELETE
  USING (account_id IN (
    SELECT account_id FROM public.account_members
    WHERE user_id = auth.uid() AND is_active = true
  ));
