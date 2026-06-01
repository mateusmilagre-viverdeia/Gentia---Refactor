
-- Feature 5: Add enriched_context to candidate_embeddings
ALTER TABLE public.candidate_embeddings 
ADD COLUMN IF NOT EXISTS enriched_context TEXT,
ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending';

-- Feature 8: Continuous hiring recommendations table
CREATE TABLE IF NOT EXISTS public.continuous_hiring_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  similarity_score NUMERIC(5,4) DEFAULT 0,
  composite_score NUMERIC(5,2) DEFAULT 0,
  recommendation_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, job_id)
);

ALTER TABLE public.continuous_hiring_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recommendations for their account"
  ON public.continuous_hiring_recommendations
  FOR SELECT TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update recommendations for their account"
  ON public.continuous_hiring_recommendations
  FOR UPDATE TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Feature 12: Candidate nudge tracking
CREATE TABLE IF NOT EXISTS public.candidate_nudge_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  application_id UUID,
  nudge_type TEXT NOT NULL DEFAULT 'pending_stage_reminder',
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

ALTER TABLE public.candidate_nudge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view nudge logs for their account"
  ON public.candidate_nudge_log
  FOR SELECT TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Enable realtime for recommendations
ALTER PUBLICATION supabase_realtime ADD TABLE public.continuous_hiring_recommendations;
