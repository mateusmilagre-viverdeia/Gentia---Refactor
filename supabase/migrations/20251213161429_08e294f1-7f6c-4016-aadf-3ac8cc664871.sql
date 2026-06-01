-- Create table for AI analysis history
CREATE TABLE public.team_maturity_ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES team_maturity_assessments(id) ON DELETE CASCADE,
  point_id UUID REFERENCES team_maturity_points(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('team', 'individual')),
  analysis JSONB NOT NULL,
  position_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_maturity_ai_analyses ENABLE ROW LEVEL SECURITY;

-- RLS policies (admin/owner only, same as assessments)
CREATE POLICY "Admins can create AI analyses"
ON public.team_maturity_ai_analyses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_maturity_assessments tma
    WHERE tma.id = team_maturity_ai_analyses.assessment_id
    AND is_account_admin_or_owner(auth.uid(), tma.account_id)
  )
);

CREATE POLICY "Admins can view AI analyses"
ON public.team_maturity_ai_analyses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_maturity_assessments tma
    WHERE tma.id = team_maturity_ai_analyses.assessment_id
    AND is_account_admin_or_owner(auth.uid(), tma.account_id)
  )
);

CREATE POLICY "Admins can delete AI analyses"
ON public.team_maturity_ai_analyses
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM team_maturity_assessments tma
    WHERE tma.id = team_maturity_ai_analyses.assessment_id
    AND is_account_admin_or_owner(auth.uid(), tma.account_id)
  )
);

-- Index for faster queries
CREATE INDEX idx_team_maturity_ai_analyses_assessment ON public.team_maturity_ai_analyses(assessment_id);
CREATE INDEX idx_team_maturity_ai_analyses_point ON public.team_maturity_ai_analyses(point_id);