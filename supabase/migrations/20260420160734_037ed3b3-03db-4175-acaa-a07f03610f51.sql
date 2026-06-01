
-- 1. Add account_type and employer linking columns to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'agency';

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS employer_linked_agency_id uuid REFERENCES public.companies(id);

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS employer_linked_client_id uuid REFERENCES public.clientes_consultoria(id);

-- Add check constraint for account_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_account_type_check'
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_account_type_check
      CHECK (account_type IN ('agency', 'employer'));
  END IF;
END $$;

-- 2. Add roi_report_scheduled_at to recruitment_jobs
ALTER TABLE public.recruitment_jobs
  ADD COLUMN IF NOT EXISTS roi_report_scheduled_at timestamptz;

-- 3. Create process_roi_reports table
CREATE TABLE IF NOT EXISTS public.process_roi_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id),
  job_id uuid NOT NULL REFERENCES public.recruitment_jobs(id),
  client_id uuid NOT NULL REFERENCES public.clientes_consultoria(id),
  public_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  report_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  views integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  generated_by uuid,
  generated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_process_roi_reports_public_token ON public.process_roi_reports (public_token);
CREATE INDEX IF NOT EXISTS idx_process_roi_reports_job_id ON public.process_roi_reports (job_id);
CREATE INDEX IF NOT EXISTS idx_process_roi_reports_client_id ON public.process_roi_reports (client_id);

-- Enable RLS
ALTER TABLE public.process_roi_reports ENABLE ROW LEVEL SECURITY;

-- Public SELECT by token (anyone with the token can view)
CREATE POLICY "Public can view reports by token"
  ON public.process_roi_reports
  FOR SELECT
  USING (true);

-- Members can insert reports for their account
CREATE POLICY "Account members can insert reports"
  ON public.process_roi_reports
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.account_members
      WHERE account_members.account_id = process_roi_reports.account_id
        AND account_members.user_id = auth.uid()
        AND account_members.is_active = true
    )
  );

-- Members can update reports for their account
CREATE POLICY "Account members can update reports"
  ON public.process_roi_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members
      WHERE account_members.account_id = process_roi_reports.account_id
        AND account_members.user_id = auth.uid()
        AND account_members.is_active = true
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_process_roi_reports_updated_at
  BEFORE UPDATE ON public.process_roi_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
