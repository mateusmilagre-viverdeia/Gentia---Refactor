-- Secure public access to ROI reports by replacing broad public table access with token-scoped RPCs
DROP POLICY IF EXISTS "Public can view reports by token" ON public.process_roi_reports;

CREATE POLICY "Account members can view reports"
ON public.process_roi_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.account_members am
    WHERE am.account_id = process_roi_reports.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
);

CREATE OR REPLACE FUNCTION public.get_roi_report_by_token(_public_token text)
RETURNS TABLE (
  id uuid,
  account_id uuid,
  job_id uuid,
  client_id uuid,
  public_token text,
  report_data jsonb,
  views integer,
  last_viewed_at timestamptz,
  generated_by uuid,
  generated_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.account_id,
    r.job_id,
    r.client_id,
    r.public_token,
    r.report_data,
    r.views,
    r.last_viewed_at,
    r.generated_by,
    r.generated_at,
    r.updated_at
  FROM public.process_roi_reports r
  WHERE r.public_token = _public_token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.increment_roi_report_view(_public_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.process_roi_reports
  SET views = COALESCE(views, 0) + 1,
      last_viewed_at = now(),
      updated_at = now()
  WHERE public_token = _public_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_roi_report_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_roi_report_view(text) TO anon, authenticated;