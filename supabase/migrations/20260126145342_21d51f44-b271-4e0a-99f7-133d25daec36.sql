-- Tabela job_icps para armazenar ICP estruturado por vaga
CREATE TABLE public.job_icps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Core fields
  role TEXT NOT NULL,
  seniority TEXT NOT NULL CHECK (seniority IN ('junior', 'pleno', 'senior', 'lead', 'specialist')),
  
  -- Skills
  mandatory_skills TEXT[] NOT NULL DEFAULT '{}',
  nice_to_have TEXT[] DEFAULT '{}',
  
  -- Experience
  experience_years_min INTEGER,
  experience_years_max INTEGER,
  
  -- Culture
  culture_traits_required TEXT[] DEFAULT '{}',
  deal_breakers TEXT[] DEFAULT '{}',
  
  -- Work context
  communication_style TEXT CHECK (communication_style IN ('direto', 'colaborativo', 'formal')),
  work_context TEXT CHECK (work_context IN ('remoto', 'hibrido', 'presencial')),
  
  -- Hunting config
  confidence_threshold INTEGER DEFAULT 60 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 100),
  search_keywords TEXT[] DEFAULT '{}',
  target_sources TEXT[] DEFAULT ARRAY['linkedin', 'github'],
  
  -- Metadata
  generated_by TEXT DEFAULT 'ai' CHECK (generated_by IN ('ai', 'manual')),
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_icps ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view ICPs for accounts they belong to
CREATE POLICY "Users can view ICPs for their accounts"
ON public.job_icps FOR SELECT
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- RLS Policy: Users can insert ICPs for accounts they belong to
CREATE POLICY "Users can create ICPs for their accounts"
ON public.job_icps FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- RLS Policy: Users can update ICPs for accounts they belong to
CREATE POLICY "Users can update ICPs for their accounts"
ON public.job_icps FOR UPDATE
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- RLS Policy: Users can delete ICPs for accounts they belong to
CREATE POLICY "Users can delete ICPs for their accounts"
ON public.job_icps FOR DELETE
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Indexes for performance
CREATE INDEX idx_job_icps_job_id ON public.job_icps(job_id);
CREATE INDEX idx_job_icps_account ON public.job_icps(account_id);
CREATE INDEX idx_job_icps_active ON public.job_icps(job_id, is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_job_icps_updated_at
  BEFORE UPDATE ON public.job_icps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add icp_id column to recruitment_hunting_searches
ALTER TABLE public.recruitment_hunting_searches 
ADD COLUMN IF NOT EXISTS icp_id UUID REFERENCES public.job_icps(id);

-- Add score_breakdown column to recruitment_hunting_results
ALTER TABLE public.recruitment_hunting_results 
ADD COLUMN IF NOT EXISTS score_breakdown JSONB;