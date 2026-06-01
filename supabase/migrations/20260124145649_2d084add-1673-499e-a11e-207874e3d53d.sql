-- =============================================
-- Sprint A2: Hunting de Candidatos (Firecrawl)
-- =============================================

-- Tabela de buscas de hunting
CREATE TABLE public.recruitment_hunting_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.recruitment_jobs(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  sources TEXT[] DEFAULT ARRAY['linkedin', 'github', 'portfolio'],
  filters JSONB DEFAULT '{}',
  results_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Tabela de resultados encontrados
CREATE TABLE public.recruitment_hunting_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES public.recruitment_hunting_searches(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('linkedin', 'github', 'portfolio', 'other')),
  source_url TEXT,
  extracted_data JSONB DEFAULT '{}',
  match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  imported_as_candidate_id UUID REFERENCES public.recruitment_candidates(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'imported', 'discarded')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_hunting_searches_account ON public.recruitment_hunting_searches(account_id);
CREATE INDEX idx_hunting_searches_status ON public.recruitment_hunting_searches(status);
CREATE INDEX idx_hunting_searches_job ON public.recruitment_hunting_searches(job_id);
CREATE INDEX idx_hunting_results_search ON public.recruitment_hunting_results(search_id);
CREATE INDEX idx_hunting_results_status ON public.recruitment_hunting_results(status);
CREATE INDEX idx_hunting_results_source ON public.recruitment_hunting_results(source);

-- Enable RLS
ALTER TABLE public.recruitment_hunting_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_hunting_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies para recruitment_hunting_searches
CREATE POLICY "Users can view hunting searches for their account"
  ON public.recruitment_hunting_searches
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create hunting searches for their account"
  ON public.recruitment_hunting_searches
  FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update hunting searches for their account"
  ON public.recruitment_hunting_searches
  FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete hunting searches for their account"
  ON public.recruitment_hunting_searches
  FOR DELETE
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies para recruitment_hunting_results
CREATE POLICY "Users can view hunting results for their account"
  ON public.recruitment_hunting_results
  FOR SELECT
  USING (
    search_id IN (
      SELECT id FROM public.recruitment_hunting_searches
      WHERE account_id IN (
        SELECT account_id FROM public.account_members 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can create hunting results for their account"
  ON public.recruitment_hunting_results
  FOR INSERT
  WITH CHECK (
    search_id IN (
      SELECT id FROM public.recruitment_hunting_searches
      WHERE account_id IN (
        SELECT account_id FROM public.account_members 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can update hunting results for their account"
  ON public.recruitment_hunting_results
  FOR UPDATE
  USING (
    search_id IN (
      SELECT id FROM public.recruitment_hunting_searches
      WHERE account_id IN (
        SELECT account_id FROM public.account_members 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can delete hunting results for their account"
  ON public.recruitment_hunting_results
  FOR DELETE
  USING (
    search_id IN (
      SELECT id FROM public.recruitment_hunting_searches
      WHERE account_id IN (
        SELECT account_id FROM public.account_members 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );