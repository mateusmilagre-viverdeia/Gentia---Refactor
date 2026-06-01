-- Cache de dados enriquecidos de candidatos
CREATE TABLE public.recruitment_enriched_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'apollo', 'clearbit'
  
  -- Dados profissionais
  current_company TEXT,
  current_title TEXT,
  seniority TEXT, -- 'entry', 'mid', 'senior', 'executive'
  linkedin_url TEXT,
  
  -- Empresa atual
  company_size TEXT,
  company_industry TEXT,
  company_location TEXT,
  
  -- Social
  twitter_url TEXT,
  github_url TEXT,
  
  -- Contato adicional
  work_email TEXT,
  personal_email TEXT,
  phone_numbers TEXT[],
  
  -- Metadata
  raw_response JSONB,
  enriched_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(candidate_id, provider)
);

-- Index for faster lookups
CREATE INDEX idx_enriched_profiles_candidate ON public.recruitment_enriched_profiles(candidate_id);
CREATE INDEX idx_enriched_profiles_expires ON public.recruitment_enriched_profiles(expires_at);

-- Enable RLS
ALTER TABLE public.recruitment_enriched_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view enriched profiles for their account candidates"
ON public.recruitment_enriched_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.recruitment_candidates rc
    JOIN public.account_members am ON am.account_id = rc.account_id
    WHERE rc.id = recruitment_enriched_profiles.candidate_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
  )
);

CREATE POLICY "Users can insert enriched profiles for their account candidates"
ON public.recruitment_enriched_profiles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recruitment_candidates rc
    JOIN public.account_members am ON am.account_id = rc.account_id
    WHERE rc.id = recruitment_enriched_profiles.candidate_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
  )
);

CREATE POLICY "Users can update enriched profiles for their account candidates"
ON public.recruitment_enriched_profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.recruitment_candidates rc
    JOIN public.account_members am ON am.account_id = rc.account_id
    WHERE rc.id = recruitment_enriched_profiles.candidate_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_recruitment_enriched_profiles_updated_at
BEFORE UPDATE ON public.recruitment_enriched_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();