-- =============================================
-- Migration: Culture Interview Criteria Evaluations
-- Creates table to persist per-criterion evaluations with percentage scores
-- =============================================

-- 1. Create new table for criteria evaluations
CREATE TABLE public.culture_interview_criteria_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.culture_interview_sessions(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES public.recruitment_agent_criteria(id) ON DELETE CASCADE,
  criterion_name TEXT NOT NULL,
  
  -- Scores in percentage (0.0 to 100.0 with 1 decimal place)
  score DECIMAL(5,1) NOT NULL CHECK (score >= 0 AND score <= 100),
  minimum_score_percent DECIMAL(5,1) CHECK (minimum_score_percent >= 0 AND minimum_score_percent <= 100),
  
  -- Qualitative analysis
  justification TEXT NOT NULL,
  alignment_level TEXT NOT NULL CHECK (alignment_level IN ('Baixo', 'Moderado', 'Forte')),
  
  -- Evidence with direct quotes
  positive_evidence JSONB DEFAULT '[]'::jsonb,
  negative_evidence JSONB DEFAULT '[]'::jsonb,
  
  -- Questions used for evaluation
  questions_used JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata from agent criteria
  importance TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 1,
  weight_multiplier INTEGER NOT NULL DEFAULT 1,
  impact_percentage DECIMAL(5,2) DEFAULT 0,
  passed_minimum BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for efficient querying
CREATE INDEX idx_criteria_eval_session ON public.culture_interview_criteria_evaluations(session_id);
CREATE INDEX idx_criteria_eval_criterion ON public.culture_interview_criteria_evaluations(criterion_id);
CREATE INDEX idx_criteria_eval_passed ON public.culture_interview_criteria_evaluations(passed_minimum);

-- 3. Enable Row Level Security
ALTER TABLE public.culture_interview_criteria_evaluations ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Account members can view criteria evaluations
CREATE POLICY "Account members can view criteria evaluations"
ON public.culture_interview_criteria_evaluations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.culture_interview_sessions cis
    WHERE cis.id = session_id
    AND public.is_account_member(auth.uid(), cis.account_id)
  )
);

-- 5. RLS Policy: Service role can insert/update
CREATE POLICY "Service role can manage criteria evaluations"
ON public.culture_interview_criteria_evaluations FOR ALL 
USING (true)
WITH CHECK (true);

-- 6. Alter matching_score from INTEGER to DECIMAL(5,1) for percentage precision
ALTER TABLE public.culture_interview_sessions 
ALTER COLUMN matching_score TYPE DECIMAL(5,1);