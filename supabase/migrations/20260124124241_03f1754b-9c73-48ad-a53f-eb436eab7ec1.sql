-- =====================================================
-- TECHNICAL INTERVIEW TABLES
-- Adaptive AI Technical Interview System
-- =====================================================

-- 1. Technical Question Bank
-- Stores curated questions by skill for HR to manage
CREATE TABLE public.technical_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.recruitment_agents(id) ON DELETE SET NULL,
  
  -- Question Content
  skill_name TEXT NOT NULL,
  skill_category TEXT,
  question_text TEXT NOT NULL,
  
  -- Difficulty & Type
  level INTEGER DEFAULT 1 CHECK (level BETWEEN 1 AND 3),
  question_type TEXT DEFAULT 'conceptual' 
    CHECK (question_type IN ('conceptual', 'practical', 'scenario', 'debugging')),
  
  -- Follow-up Branches for Adaptive Logic
  followup_if_superficial TEXT,
  followup_if_incorrect TEXT,
  followup_if_excellent TEXT,
  
  -- Expected Answers
  expected_keywords JSONB DEFAULT '[]',
  excellent_answer_example TEXT,
  
  -- Metadata
  is_mandatory BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  avg_score NUMERIC(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Technical Interview Sessions
-- Main session table for each technical interview
CREATE TABLE public.technical_interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.recruitment_candidates(id) ON DELETE SET NULL,
  candidate_profile_id UUID REFERENCES public.candidate_profiles(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.recruitment_agents(id) ON DELETE SET NULL,
  
  -- Access Token
  token TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'expired')),
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Questions & Responses
  questions JSONB DEFAULT '[]',
  transcript TEXT,
  ai_messages JSONB DEFAULT '[]',
  
  -- Audio Storage
  audio_url TEXT,
  audio_storage_path TEXT,
  
  -- Scores & Evaluation
  skill_scores JSONB DEFAULT '{}',
  skill_levels JSONB DEFAULT '{}',
  overall_score NUMERIC(5,2),
  evaluation_summary TEXT,
  strengths JSONB DEFAULT '[]',
  gaps JSONB DEFAULT '[]',
  recommendation TEXT CHECK (recommendation IN ('recommended', 'conditional', 'not_recommended')),
  
  -- Context Snapshot
  job_description_context JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Technical Interview Responses
-- Individual question-response pairs for detailed tracking
CREATE TABLE public.technical_interview_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.technical_interview_sessions(id) ON DELETE CASCADE,
  
  -- Question Info
  skill_name TEXT NOT NULL,
  skill_type TEXT CHECK (skill_type IN ('required', 'desired')),
  question_index INTEGER,
  question_text TEXT NOT NULL,
  question_level INTEGER DEFAULT 1 CHECK (question_level BETWEEN 1 AND 3),
  is_followup BOOLEAN DEFAULT FALSE,
  parent_response_id UUID REFERENCES public.technical_interview_responses(id) ON DELETE SET NULL,
  
  -- Candidate Response
  candidate_response TEXT,
  response_quality TEXT CHECK (response_quality IN ('excellent', 'correct', 'partial', 'incorrect', 'superficial')),
  
  -- AI Evaluation
  score NUMERIC(5,2),
  ai_analysis TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Question Bank indexes
CREATE INDEX idx_technical_question_bank_account ON public.technical_question_bank(account_id);
CREATE INDEX idx_technical_question_bank_skill ON public.technical_question_bank(skill_name);
CREATE INDEX idx_technical_question_bank_agent ON public.technical_question_bank(agent_id);
CREATE INDEX idx_technical_question_bank_active ON public.technical_question_bank(is_active) WHERE is_active = true;

-- Session indexes
CREATE INDEX idx_technical_interview_sessions_account ON public.technical_interview_sessions(account_id);
CREATE INDEX idx_technical_interview_sessions_job ON public.technical_interview_sessions(job_id);
CREATE INDEX idx_technical_interview_sessions_candidate ON public.technical_interview_sessions(candidate_id);
CREATE INDEX idx_technical_interview_sessions_token ON public.technical_interview_sessions(token);
CREATE INDEX idx_technical_interview_sessions_status ON public.technical_interview_sessions(status);

-- Response indexes
CREATE INDEX idx_technical_interview_responses_session ON public.technical_interview_responses(session_id);
CREATE INDEX idx_technical_interview_responses_skill ON public.technical_interview_responses(skill_name);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.technical_question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_interview_responses ENABLE ROW LEVEL SECURITY;

-- Question Bank Policies (account members only)
CREATE POLICY "Account members can view question bank"
  ON public.technical_question_bank FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = technical_question_bank.account_id
        AND am.user_id = auth.uid()
        AND am.is_active = true
    )
  );

CREATE POLICY "Account members can manage question bank"
  ON public.technical_question_bank FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = technical_question_bank.account_id
        AND am.user_id = auth.uid()
        AND am.is_active = true
    )
  );

-- Session Policies
CREATE POLICY "Account members can view technical sessions"
  ON public.technical_interview_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = technical_interview_sessions.account_id
        AND am.user_id = auth.uid()
        AND am.is_active = true
    )
  );

CREATE POLICY "Account members can manage technical sessions"
  ON public.technical_interview_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = technical_interview_sessions.account_id
        AND am.user_id = auth.uid()
        AND am.is_active = true
    )
  );

-- Candidates can access their own session via token (for public interview page)
CREATE POLICY "Candidates can view own session via token"
  ON public.technical_interview_sessions FOR SELECT
  USING (
    token IS NOT NULL 
    AND expires_at > NOW()
    AND status IN ('pending', 'in_progress')
  );

CREATE POLICY "Candidates can update own session"
  ON public.technical_interview_sessions FOR UPDATE
  USING (
    token IS NOT NULL 
    AND expires_at > NOW()
    AND status IN ('pending', 'in_progress')
  );

-- Response Policies
CREATE POLICY "Account members can view technical responses"
  ON public.technical_interview_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.technical_interview_sessions tis
      JOIN public.account_members am ON am.account_id = tis.account_id
      WHERE tis.id = technical_interview_responses.session_id
        AND am.user_id = auth.uid()
        AND am.is_active = true
    )
  );

CREATE POLICY "Account members can manage technical responses"
  ON public.technical_interview_responses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.technical_interview_sessions tis
      JOIN public.account_members am ON am.account_id = tis.account_id
      WHERE tis.id = technical_interview_responses.session_id
        AND am.user_id = auth.uid()
        AND am.is_active = true
    )
  );

-- Service role bypass for edge functions
CREATE POLICY "Service role bypass for question bank"
  ON public.technical_question_bank FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass for sessions"
  ON public.technical_interview_sessions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass for responses"
  ON public.technical_interview_responses FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at trigger for question bank
CREATE TRIGGER update_technical_question_bank_updated_at
  BEFORE UPDATE ON public.technical_question_bank
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Updated_at trigger for sessions
CREATE TRIGGER update_technical_interview_sessions_updated_at
  BEFORE UPDATE ON public.technical_interview_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- WORKFLOW STEP TYPE UPDATE
-- Add 'technical' to the workflow step types
-- =====================================================

-- First check if the constraint exists and update it
ALTER TABLE public.recruitment_job_workflow_steps 
  DROP CONSTRAINT IF EXISTS recruitment_job_workflow_steps_step_type_check;

ALTER TABLE public.recruitment_job_workflow_steps 
  ADD CONSTRAINT recruitment_job_workflow_steps_step_type_check 
  CHECK (step_type IN ('cultural', 'disc', 'technical'));