-- =============================================
-- Recruitment DISC Profiles - Perfil desejado por vaga
-- =============================================
CREATE TABLE public.recruitment_disc_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  primary_profile TEXT NOT NULL CHECK (primary_profile IN ('D', 'I', 'S', 'C')),
  secondary_profile TEXT CHECK (secondary_profile IS NULL OR secondary_profile IN ('D', 'I', 'S', 'C')),
  min_match_score INTEGER NOT NULL DEFAULT 70 CHECK (min_match_score >= 0 AND min_match_score <= 100),
  weight_d INTEGER NOT NULL DEFAULT 25 CHECK (weight_d >= 0 AND weight_d <= 100),
  weight_i INTEGER NOT NULL DEFAULT 25 CHECK (weight_i >= 0 AND weight_i <= 100),
  weight_s INTEGER NOT NULL DEFAULT 25 CHECK (weight_s >= 0 AND weight_s <= 100),
  weight_c INTEGER NOT NULL DEFAULT 25 CHECK (weight_c >= 0 AND weight_c <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id)
);

-- =============================================
-- Candidate DISC Sessions - Sessões de assessment para candidatos
-- =============================================
CREATE TABLE public.candidate_disc_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.recruitment_agents(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'expired')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for token lookup
CREATE INDEX idx_candidate_disc_sessions_token ON public.candidate_disc_sessions(token);
CREATE INDEX idx_candidate_disc_sessions_candidate ON public.candidate_disc_sessions(candidate_id);
CREATE INDEX idx_candidate_disc_sessions_job ON public.candidate_disc_sessions(job_id);

-- =============================================
-- Candidate DISC Responses - Respostas do candidato
-- =============================================
CREATE TABLE public.candidate_disc_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.candidate_disc_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.disc_questions(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, question_id)
);

CREATE INDEX idx_candidate_disc_responses_session ON public.candidate_disc_responses(session_id);

-- =============================================
-- Candidate DISC Results - Resultados calculados
-- =============================================
CREATE TABLE public.candidate_disc_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL UNIQUE REFERENCES public.candidate_disc_sessions(id) ON DELETE CASCADE,
  
  -- Raw scores (8-40 per dimension)
  d_score INTEGER NOT NULL,
  i_score INTEGER NOT NULL,
  s_score INTEGER NOT NULL,
  c_score INTEGER NOT NULL,
  
  -- Normalized scores (0-100)
  d_normalized INTEGER NOT NULL,
  i_normalized INTEGER NOT NULL,
  s_normalized INTEGER NOT NULL,
  c_normalized INTEGER NOT NULL,
  
  -- Profile identification
  primary_profile TEXT NOT NULL CHECK (primary_profile IN ('D', 'I', 'S', 'C')),
  secondary_profile TEXT CHECK (secondary_profile IS NULL OR secondary_profile IN ('D', 'I', 'S', 'C')),
  
  -- Intensity
  intensity TEXT NOT NULL CHECK (intensity IN ('baixa', 'média', 'alta')),
  is_balanced BOOLEAN NOT NULL DEFAULT false,
  
  -- Match score with job profile (0-100)
  match_score INTEGER CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 100)),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidate_disc_results_session ON public.candidate_disc_results(session_id);

-- =============================================
-- RLS Policies
-- =============================================

-- recruitment_disc_profiles
ALTER TABLE public.recruitment_disc_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view disc profiles for jobs they have access to"
ON public.recruitment_disc_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.recruitment_jobs rj
    JOIN public.account_members am ON am.account_id = rj.account_id
    WHERE rj.id = recruitment_disc_profiles.job_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
  )
);

CREATE POLICY "Users can insert disc profiles for jobs they manage"
ON public.recruitment_disc_profiles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recruitment_jobs rj
    JOIN public.account_members am ON am.account_id = rj.account_id
    WHERE rj.id = job_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
    AND am.role IN ('owner', 'admin', 'admin_rh', 'leader')
  )
);

CREATE POLICY "Users can update disc profiles for jobs they manage"
ON public.recruitment_disc_profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.recruitment_jobs rj
    JOIN public.account_members am ON am.account_id = rj.account_id
    WHERE rj.id = recruitment_disc_profiles.job_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
    AND am.role IN ('owner', 'admin', 'admin_rh', 'leader')
  )
);

CREATE POLICY "Users can delete disc profiles for jobs they manage"
ON public.recruitment_disc_profiles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.recruitment_jobs rj
    JOIN public.account_members am ON am.account_id = rj.account_id
    WHERE rj.id = recruitment_disc_profiles.job_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
    AND am.role IN ('owner', 'admin', 'admin_rh', 'leader')
  )
);

-- candidate_disc_sessions
ALTER TABLE public.candidate_disc_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view disc sessions for their account"
ON public.candidate_disc_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = candidate_disc_sessions.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
  )
);

CREATE POLICY "Users can insert disc sessions for their account"
ON public.candidate_disc_sessions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
    AND am.role IN ('owner', 'admin', 'admin_rh', 'leader')
  )
);

CREATE POLICY "Users can update disc sessions for their account"
ON public.candidate_disc_sessions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = candidate_disc_sessions.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
  )
);

-- Public access via token for candidates taking the assessment
CREATE POLICY "Anyone can view session by valid token"
ON public.candidate_disc_sessions FOR SELECT
USING (
  token IS NOT NULL 
  AND status != 'expired'
  AND expires_at > now()
);

CREATE POLICY "Anyone can update session status via token"
ON public.candidate_disc_sessions FOR UPDATE
USING (
  token IS NOT NULL 
  AND status IN ('pending', 'in_progress')
  AND expires_at > now()
);

-- candidate_disc_responses
ALTER TABLE public.candidate_disc_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view responses for sessions in their account"
ON public.candidate_disc_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.candidate_disc_sessions cds
    JOIN public.account_members am ON am.account_id = cds.account_id
    WHERE cds.id = candidate_disc_responses.session_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
  )
);

CREATE POLICY "Anyone can insert responses for valid sessions"
ON public.candidate_disc_responses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.candidate_disc_sessions cds
    WHERE cds.id = session_id
    AND cds.status IN ('pending', 'in_progress')
    AND cds.expires_at > now()
  )
);

-- candidate_disc_results
ALTER TABLE public.candidate_disc_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view results for sessions in their account"
ON public.candidate_disc_results FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.candidate_disc_sessions cds
    JOIN public.account_members am ON am.account_id = cds.account_id
    WHERE cds.id = candidate_disc_results.session_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
  )
);

CREATE POLICY "Anyone can insert results for valid sessions"
ON public.candidate_disc_results FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.candidate_disc_sessions cds
    WHERE cds.id = session_id
    AND cds.status = 'in_progress'
  )
);

-- =============================================
-- Triggers for updated_at
-- =============================================
CREATE TRIGGER update_recruitment_disc_profiles_updated_at
BEFORE UPDATE ON public.recruitment_disc_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();