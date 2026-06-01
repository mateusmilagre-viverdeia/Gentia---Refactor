
CREATE TABLE public.recruitment_screening_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.recruitment_applications(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  passed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.recruitment_screening_results ENABLE ROW LEVEL SECURITY;

-- Public insert (candidates are not authenticated)
CREATE POLICY "Anyone can insert screening results"
  ON public.recruitment_screening_results
  FOR INSERT
  WITH CHECK (true);

-- Account members can read
CREATE POLICY "Account members can read screening results"
  ON public.recruitment_screening_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = recruitment_screening_results.account_id
        AND am.user_id = auth.uid()
        AND am.is_active = true
    )
  );

-- Index for performance
CREATE INDEX idx_screening_results_application ON public.recruitment_screening_results(application_id);
CREATE INDEX idx_screening_results_job ON public.recruitment_screening_results(job_id, account_id);
