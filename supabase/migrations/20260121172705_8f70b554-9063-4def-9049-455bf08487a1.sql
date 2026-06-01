-- =============================================
-- Phase 9: AI Recommendations System (Fixed RLS)
-- =============================================

-- Drop existing types if they exist (from partial migration)
DROP TYPE IF EXISTS recommendation_category CASCADE;
DROP TYPE IF EXISTS recommendation_priority CASCADE;
DROP TYPE IF EXISTS recommendation_status CASCADE;
DROP TYPE IF EXISTS recommendation_feedback_type CASCADE;

-- Drop existing tables if they exist (from partial migration)
DROP TABLE IF EXISTS public.recommendation_generation_log CASCADE;
DROP TABLE IF EXISTS public.success_patterns CASCADE;
DROP TABLE IF EXISTS public.recommendation_feedback CASCADE;
DROP TABLE IF EXISTS public.project_recommendations CASCADE;

-- Recommendation Categories Enum
CREATE TYPE recommendation_category AS ENUM (
  'health_improvement',
  'next_action', 
  'risk_mitigation',
  'quick_win',
  'best_practice'
);

-- Recommendation Priority Enum
CREATE TYPE recommendation_priority AS ENUM ('high', 'medium', 'low');

-- Recommendation Status Enum
CREATE TYPE recommendation_status AS ENUM ('pending', 'accepted', 'dismissed', 'completed');

-- Feedback Type Enum
CREATE TYPE recommendation_feedback_type AS ENUM ('helpful', 'not_helpful', 'implemented', 'incorrect');

-- =============================================
-- Project Recommendations Table
-- =============================================
CREATE TABLE public.project_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category recommendation_category NOT NULL,
  priority recommendation_priority NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rationale TEXT,
  suggested_tools JSONB DEFAULT '[]'::jsonb,
  expected_impact TEXT,
  status recommendation_status NOT NULL DEFAULT 'pending',
  accepted_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  dismissed_reason TEXT,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  created_by TEXT NOT NULL DEFAULT 'ai_system',
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for project_recommendations
CREATE INDEX idx_project_recommendations_account ON public.project_recommendations(account_id);
CREATE INDEX idx_project_recommendations_status ON public.project_recommendations(status);
CREATE INDEX idx_project_recommendations_priority ON public.project_recommendations(priority);
CREATE INDEX idx_project_recommendations_category ON public.project_recommendations(category);
CREATE INDEX idx_project_recommendations_expires ON public.project_recommendations(expires_at) WHERE status = 'pending';

-- =============================================
-- Recommendation Feedback Table
-- =============================================
CREATE TABLE public.recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES public.project_recommendations(id) ON DELETE CASCADE,
  feedback_type recommendation_feedback_type NOT NULL,
  comment TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for recommendation_feedback
CREATE INDEX idx_recommendation_feedback_recommendation ON public.recommendation_feedback(recommendation_id);

-- =============================================
-- Success Patterns Table (for ML learning)
-- =============================================
CREATE TABLE public.success_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL,
  pattern_name TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  outcomes JSONB NOT NULL DEFAULT '{}'::jsonb,
  sample_size INTEGER NOT NULL DEFAULT 0,
  confidence DECIMAL(5,4) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for success_patterns
CREATE INDEX idx_success_patterns_type ON public.success_patterns(pattern_type);
CREATE INDEX idx_success_patterns_active ON public.success_patterns(is_active) WHERE is_active = true;

-- =============================================
-- Recommendation Generation Log (rate limiting)
-- =============================================
CREATE TABLE public.recommendation_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recommendations_count INTEGER NOT NULL DEFAULT 0,
  context TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT
);

-- Index for rate limiting check
CREATE INDEX idx_recommendation_generation_log_account_time 
  ON public.recommendation_generation_log(account_id, generated_at DESC);

-- =============================================
-- Updated_at Triggers
-- =============================================
CREATE TRIGGER update_project_recommendations_updated_at
  BEFORE UPDATE ON public.project_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_success_patterns_updated_at
  BEFORE UPDATE ON public.success_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS Policies
-- =============================================

-- Enable RLS
ALTER TABLE public.project_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.success_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_generation_log ENABLE ROW LEVEL SECURITY;

-- Project Recommendations Policies (using user_roles table for head_cs/super_admin check)
CREATE POLICY "EP consultants can view recommendations for assigned projects"
  ON public.project_recommendations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.consultant_assignments ca
      JOIN public.ep_consultants ec ON ec.id = ca.consultant_id
      WHERE ca.account_id = project_recommendations.account_id
        AND ec.user_id = auth.uid()
        AND ca.active = true
    )
    OR is_head_cs(auth.uid())
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "EP consultants can insert recommendations for assigned projects"
  ON public.project_recommendations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.consultant_assignments ca
      JOIN public.ep_consultants ec ON ec.id = ca.consultant_id
      WHERE ca.account_id = project_recommendations.account_id
        AND ec.user_id = auth.uid()
        AND ca.active = true
    )
    OR is_head_cs(auth.uid())
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "EP consultants can update recommendations for assigned projects"
  ON public.project_recommendations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.consultant_assignments ca
      JOIN public.ep_consultants ec ON ec.id = ca.consultant_id
      WHERE ca.account_id = project_recommendations.account_id
        AND ec.user_id = auth.uid()
        AND ca.active = true
    )
    OR is_head_cs(auth.uid())
    OR is_super_admin(auth.uid())
  );

-- Recommendation Feedback Policies
CREATE POLICY "Users can view feedback they created"
  ON public.recommendation_feedback FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own feedback"
  ON public.recommendation_feedback FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Success Patterns - Read only for EP consultants
CREATE POLICY "EP consultants can view success patterns"
  ON public.success_patterns FOR SELECT
  USING (
    is_ep_consultant(auth.uid())
    OR is_head_cs(auth.uid())
    OR is_super_admin(auth.uid())
  );

-- Generation Log Policies
CREATE POLICY "EP consultants can view generation logs for assigned projects"
  ON public.recommendation_generation_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.consultant_assignments ca
      JOIN public.ep_consultants ec ON ec.id = ca.consultant_id
      WHERE ca.account_id = recommendation_generation_log.account_id
        AND ec.user_id = auth.uid()
        AND ca.active = true
    )
    OR is_head_cs(auth.uid())
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "EP consultants can insert generation logs for assigned projects"
  ON public.recommendation_generation_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.consultant_assignments ca
      JOIN public.ep_consultants ec ON ec.id = ca.consultant_id
      WHERE ca.account_id = recommendation_generation_log.account_id
        AND ec.user_id = auth.uid()
        AND ca.active = true
    )
    OR is_head_cs(auth.uid())
    OR is_super_admin(auth.uid())
  );

-- =============================================
-- Helper Function: Check Rate Limit for Recommendations
-- =============================================
CREATE OR REPLACE FUNCTION public.check_recommendation_rate_limit(
  p_account_id UUID,
  p_hours_limit INTEGER DEFAULT 24
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_generation TIMESTAMPTZ;
BEGIN
  SELECT generated_at INTO v_last_generation
  FROM public.recommendation_generation_log
  WHERE account_id = p_account_id
    AND success = true
  ORDER BY generated_at DESC
  LIMIT 1;
  
  IF v_last_generation IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN v_last_generation < (now() - (p_hours_limit || ' hours')::interval);
END;
$$;