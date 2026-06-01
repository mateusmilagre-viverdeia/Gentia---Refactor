-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for candidate embeddings (CV, LinkedIn, cover letter)
CREATE TABLE public.candidate_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('resume', 'linkedin', 'cover_letter', 'profile')),
  content_text TEXT, -- Original text for reference
  content_hash TEXT NOT NULL, -- MD5 hash to detect changes
  embedding vector(768), -- Gemini text-embedding-004 dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, source_type)
);

-- Table for job embeddings (description, requirements)
CREATE TABLE public.job_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('description', 'requirements', 'full')),
  content_text TEXT,
  content_hash TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, source_type)
);

-- Create HNSW indexes for fast similarity search
CREATE INDEX candidate_embeddings_embedding_idx ON public.candidate_embeddings 
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX job_embeddings_embedding_idx ON public.job_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- Regular indexes for filtering
CREATE INDEX candidate_embeddings_candidate_id_idx ON public.candidate_embeddings(candidate_id);
CREATE INDEX candidate_embeddings_account_id_idx ON public.candidate_embeddings(account_id);
CREATE INDEX job_embeddings_job_id_idx ON public.job_embeddings(job_id);
CREATE INDEX job_embeddings_account_id_idx ON public.job_embeddings(account_id);

-- Enable RLS
ALTER TABLE public.candidate_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for candidate_embeddings
CREATE POLICY "Users can view candidate embeddings from their organization"
ON public.candidate_embeddings FOR SELECT
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can insert candidate embeddings for their organization"
ON public.candidate_embeddings FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can update candidate embeddings in their organization"
ON public.candidate_embeddings FOR UPDATE
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can delete candidate embeddings from their organization"
ON public.candidate_embeddings FOR DELETE
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- RLS Policies for job_embeddings
CREATE POLICY "Users can view job embeddings from their organization"
ON public.job_embeddings FOR SELECT
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can insert job embeddings for their organization"
ON public.job_embeddings FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can update job embeddings in their organization"
ON public.job_embeddings FOR UPDATE
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can delete job embeddings from their organization"
ON public.job_embeddings FOR DELETE
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Function to search similar candidates using cosine similarity
CREATE OR REPLACE FUNCTION public.search_similar_candidates(
  query_embedding vector(768),
  p_account_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  candidate_id UUID,
  similarity FLOAT,
  source_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.candidate_id,
    1 - (ce.embedding <=> query_embedding) AS similarity,
    ce.source_type
  FROM candidate_embeddings ce
  WHERE ce.account_id = p_account_id
    AND ce.embedding IS NOT NULL
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to search similar jobs for a candidate
CREATE OR REPLACE FUNCTION public.search_similar_jobs(
  query_embedding vector(768),
  p_account_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  job_id UUID,
  similarity FLOAT,
  source_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    je.job_id,
    1 - (je.embedding <=> query_embedding) AS similarity,
    je.source_type
  FROM job_embeddings je
  WHERE je.account_id = p_account_id
    AND je.embedding IS NOT NULL
    AND 1 - (je.embedding <=> query_embedding) > match_threshold
  ORDER BY je.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to find matching candidates for a job
CREATE OR REPLACE FUNCTION public.match_candidates_for_job(
  p_job_id UUID,
  p_account_id UUID,
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  candidate_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_vector vector(768);
BEGIN
  -- Get the job embedding
  SELECT je.embedding INTO job_vector
  FROM job_embeddings je
  WHERE je.job_id = p_job_id
    AND je.account_id = p_account_id
    AND je.source_type = 'full'
  LIMIT 1;
  
  IF job_vector IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    ce.candidate_id,
    1 - (ce.embedding <=> job_vector) AS similarity
  FROM candidate_embeddings ce
  WHERE ce.account_id = p_account_id
    AND ce.embedding IS NOT NULL
    AND 1 - (ce.embedding <=> job_vector) > match_threshold
  ORDER BY ce.embedding <=> job_vector
  LIMIT match_count;
END;
$$;

-- Function to find matching jobs for a candidate
CREATE OR REPLACE FUNCTION public.match_jobs_for_candidate(
  p_candidate_id UUID,
  p_account_id UUID,
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  job_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate_vector vector(768);
BEGIN
  -- Get the candidate embedding (prefer resume, then profile)
  SELECT ce.embedding INTO candidate_vector
  FROM candidate_embeddings ce
  WHERE ce.candidate_id = p_candidate_id
    AND ce.account_id = p_account_id
  ORDER BY 
    CASE ce.source_type 
      WHEN 'resume' THEN 1 
      WHEN 'profile' THEN 2 
      ELSE 3 
    END
  LIMIT 1;
  
  IF candidate_vector IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    je.job_id,
    1 - (je.embedding <=> candidate_vector) AS similarity
  FROM job_embeddings je
  WHERE je.account_id = p_account_id
    AND je.embedding IS NOT NULL
    AND 1 - (je.embedding <=> candidate_vector) > match_threshold
  ORDER BY je.embedding <=> candidate_vector
  LIMIT match_count;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_candidate_embeddings_updated_at
  BEFORE UPDATE ON public.candidate_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_embeddings_updated_at
  BEFORE UPDATE ON public.job_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();