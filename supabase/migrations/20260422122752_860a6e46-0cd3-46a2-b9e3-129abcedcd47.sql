CREATE POLICY "Linked employer accounts can view client reports"
ON public.process_roi_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.account_members am
    JOIN public.companies c ON c.id = am.account_id
    WHERE am.user_id = auth.uid()
      AND am.is_active = true
      AND c.account_type = 'employer'
      AND c.employer_linked_client_id = process_roi_reports.client_id
  )
);