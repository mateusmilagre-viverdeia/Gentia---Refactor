CREATE TABLE public.technical_interview_resume_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.technical_interview_sessions(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'unknown',
  professional_summary TEXT,
  experience_years NUMERIC,
  skills_found TEXT[] DEFAULT '{}',
  skills_match JSONB DEFAULT '{}',
  predictive_score NUMERIC DEFAULT 0,
  exploration_points TEXT[] DEFAULT '{}',
  raw_profile_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_session_intelligence UNIQUE (session_id)
);

ALTER TABLE public.technical_interview_resume_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on resume intelligence"
  ON public.technical_interview_resume_intelligence
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read resume intelligence for their account"
  ON public.technical_interview_resume_intelligence
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.technical_interview_sessions tis
      JOIN public.account_members am ON am.account_id = tis.account_id
      WHERE tis.id = technical_interview_resume_intelligence.session_id
        AND am.user_id = auth.uid()
        AND am.is_active = true
    )
  );