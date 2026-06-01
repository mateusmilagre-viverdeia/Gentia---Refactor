
-- Create enums for performance reviews
CREATE TYPE public.review_period AS ENUM ('30_days', '90_days', '6_months', '12_months');
CREATE TYPE public.retention_status AS ENUM ('active', 'voluntary_exit', 'involuntary_exit');

-- Create hire_performance_reviews table
CREATE TABLE public.hire_performance_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.recruitment_applications(id) ON DELETE SET NULL,
  review_period review_period NOT NULL,
  performance_score INTEGER NOT NULL CHECK (performance_score >= 1 AND performance_score <= 10),
  retention_status retention_status NOT NULL DEFAULT 'active',
  reviewer_notes TEXT,
  reviewed_by UUID NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, job_id, review_period)
);

-- Add autopilot_enabled to recruitment_jobs
ALTER TABLE public.recruitment_jobs ADD COLUMN IF NOT EXISTS autopilot_enabled BOOLEAN NOT NULL DEFAULT true;

-- Enable RLS
ALTER TABLE public.hire_performance_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for hire_performance_reviews
CREATE POLICY "Users can view performance reviews of their org"
  ON public.hire_performance_reviews FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can insert performance reviews for their org"
  ON public.hire_performance_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update performance reviews of their org"
  ON public.hire_performance_reviews FOR UPDATE
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
