
DROP POLICY IF EXISTS "Admins can insert channels" ON public.job_distribution_channels;
CREATE POLICY "Members can insert channels"
  ON public.job_distribution_channels FOR INSERT
  WITH CHECK (account_id IN (
    SELECT account_id FROM public.account_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

DROP POLICY IF EXISTS "Admins can update channels" ON public.job_distribution_channels;
CREATE POLICY "Members can update channels"
  ON public.job_distribution_channels FOR UPDATE
  USING (account_id IN (
    SELECT account_id FROM public.account_members
    WHERE user_id = auth.uid() AND is_active = true
  ));
