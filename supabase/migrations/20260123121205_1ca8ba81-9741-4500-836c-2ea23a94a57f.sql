-- Tighten write access for ROI + Headcount planning tables
-- Read stays available to account members; writes only for account admins (owner/admin/admin_rh).

-- recruitment_source_spend
DROP POLICY IF EXISTS "Account members can insert recruitment source spend" ON public.recruitment_source_spend;
DROP POLICY IF EXISTS "Account members can update recruitment source spend" ON public.recruitment_source_spend;
DROP POLICY IF EXISTS "Account members can delete recruitment source spend" ON public.recruitment_source_spend;

CREATE POLICY "Account admins can insert recruitment source spend"
ON public.recruitment_source_spend
FOR INSERT
TO authenticated
WITH CHECK (public.is_account_admin_or_owner(auth.uid(), account_id));

CREATE POLICY "Account admins can update recruitment source spend"
ON public.recruitment_source_spend
FOR UPDATE
TO authenticated
USING (public.is_account_admin_or_owner(auth.uid(), account_id))
WITH CHECK (public.is_account_admin_or_owner(auth.uid(), account_id));

CREATE POLICY "Account admins can delete recruitment source spend"
ON public.recruitment_source_spend
FOR DELETE
TO authenticated
USING (public.is_account_admin_or_owner(auth.uid(), account_id));

-- recruitment_headcount_plan
DROP POLICY IF EXISTS "Account members can insert recruitment headcount plan" ON public.recruitment_headcount_plan;
DROP POLICY IF EXISTS "Account members can update recruitment headcount plan" ON public.recruitment_headcount_plan;
DROP POLICY IF EXISTS "Account members can delete recruitment headcount plan" ON public.recruitment_headcount_plan;

CREATE POLICY "Account admins can insert recruitment headcount plan"
ON public.recruitment_headcount_plan
FOR INSERT
TO authenticated
WITH CHECK (public.is_account_admin_or_owner(auth.uid(), account_id));

CREATE POLICY "Account admins can update recruitment headcount plan"
ON public.recruitment_headcount_plan
FOR UPDATE
TO authenticated
USING (public.is_account_admin_or_owner(auth.uid(), account_id))
WITH CHECK (public.is_account_admin_or_owner(auth.uid(), account_id));

CREATE POLICY "Account admins can delete recruitment headcount plan"
ON public.recruitment_headcount_plan
FOR DELETE
TO authenticated
USING (public.is_account_admin_or_owner(auth.uid(), account_id));
