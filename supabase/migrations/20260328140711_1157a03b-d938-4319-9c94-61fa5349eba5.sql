
CREATE TABLE public.culture_interview_behavioral_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.culture_interview_sessions(id) ON DELETE CASCADE,
  communication_score NUMERIC(4,1) DEFAULT 0,
  structured_reasoning_score NUMERIC(4,1) DEFAULT 0,
  emotional_intelligence_score NUMERIC(4,1) DEFAULT 0,
  leadership_score NUMERIC(4,1) DEFAULT 0,
  adaptability_score NUMERIC(4,1) DEFAULT 0,
  results_orientation_score NUMERIC(4,1) DEFAULT 0,
  overall_behavioral_score NUMERIC(4,1) DEFAULT 0,
  disc_indicators JSONB DEFAULT NULL,
  cultural_convergences JSONB DEFAULT NULL,
  badges TEXT[] DEFAULT '{}',
  summary TEXT,
  dimension_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

ALTER TABLE public.culture_interview_behavioral_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view behavioral insights for their account sessions"
ON public.culture_interview_behavioral_insights
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.culture_interview_sessions cis
    JOIN public.account_members am ON am.account_id = cis.account_id
    WHERE cis.id = culture_interview_behavioral_insights.session_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
  )
);

CREATE POLICY "Service role can manage behavioral insights"
ON public.culture_interview_behavioral_insights
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
