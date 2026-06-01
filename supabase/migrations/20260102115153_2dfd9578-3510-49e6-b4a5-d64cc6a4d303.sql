
-- Create recruitment_candidates table
CREATE TABLE public.recruitment_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Personal data
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  linkedin_url TEXT,
  avatar_url TEXT,
  
  -- Status
  stage TEXT DEFAULT 'lead',
  status TEXT DEFAULT 'active',
  
  -- Metadata
  source TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(account_id, email)
);

-- Create recruitment_jobs table
CREATE TABLE public.recruitment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Job data
  title TEXT NOT NULL,
  description TEXT,
  department TEXT,
  location TEXT,
  employment_type TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  
  -- Agent reference
  agent_id UUID,
  
  -- Status
  status TEXT DEFAULT 'draft',
  
  -- Settings
  is_public BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- Create recruitment_applications table
CREATE TABLE public.recruitment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Application status
  status TEXT DEFAULT 'pending',
  
  -- Form data
  cover_letter TEXT,
  resume_url TEXT,
  form_responses JSONB,
  
  -- Evaluation
  score NUMERIC,
  evaluation_status TEXT,
  
  -- Timestamps
  applied_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(candidate_id, job_id)
);

-- Create recruitment_interviews table
CREATE TABLE public.recruitment_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.recruitment_applications(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  agent_id UUID,
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT DEFAULT 'pending',
  evaluation_status TEXT,
  
  -- Interview data
  overall_score NUMERIC,
  duration_seconds INTEGER,
  transcript JSONB,
  criteria_evaluations JSONB,
  
  -- Token for public access
  access_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.recruitment_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_interviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recruitment_candidates
CREATE POLICY "Members can view candidates"
  ON public.recruitment_candidates FOR SELECT
  TO authenticated
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can insert candidates"
  ON public.recruitment_candidates FOR INSERT
  TO authenticated
  WITH CHECK (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can update candidates"
  ON public.recruitment_candidates FOR UPDATE
  TO authenticated
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can delete candidates"
  ON public.recruitment_candidates FOR DELETE
  TO authenticated
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Public can self-register as candidate"
  ON public.recruitment_candidates FOR INSERT
  TO anon
  WITH CHECK (true);

-- RLS Policies for recruitment_jobs
CREATE POLICY "Members can manage jobs"
  ON public.recruitment_jobs FOR ALL
  TO authenticated
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Public can view active jobs"
  ON public.recruitment_jobs FOR SELECT
  TO anon
  USING (status = 'active' AND is_public = true);

-- RLS Policies for recruitment_applications
CREATE POLICY "Members can manage applications"
  ON public.recruitment_applications FOR ALL
  TO authenticated
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Public can create applications"
  ON public.recruitment_applications FOR INSERT
  TO anon
  WITH CHECK (true);

-- RLS Policies for recruitment_interviews
CREATE POLICY "Members can manage interviews"
  ON public.recruitment_interviews FOR ALL
  TO authenticated
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Public can view own interview by token"
  ON public.recruitment_interviews FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can update own interview"
  ON public.recruitment_interviews FOR UPDATE
  TO anon
  USING (true);

-- Create updated_at triggers
CREATE TRIGGER update_recruitment_candidates_updated_at
  BEFORE UPDATE ON public.recruitment_candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recruitment_jobs_updated_at
  BEFORE UPDATE ON public.recruitment_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recruitment_applications_updated_at
  BEFORE UPDATE ON public.recruitment_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recruitment_interviews_updated_at
  BEFORE UPDATE ON public.recruitment_interviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_recruitment_candidates_account_id ON public.recruitment_candidates(account_id);
CREATE INDEX idx_recruitment_candidates_email ON public.recruitment_candidates(email);
CREATE INDEX idx_recruitment_jobs_account_id ON public.recruitment_jobs(account_id);
CREATE INDEX idx_recruitment_jobs_status ON public.recruitment_jobs(status);
CREATE INDEX idx_recruitment_applications_candidate_id ON public.recruitment_applications(candidate_id);
CREATE INDEX idx_recruitment_applications_job_id ON public.recruitment_applications(job_id);
CREATE INDEX idx_recruitment_interviews_access_token ON public.recruitment_interviews(access_token);
