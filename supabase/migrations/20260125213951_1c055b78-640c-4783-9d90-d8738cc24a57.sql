-- Create job benchmark cache table
CREATE TABLE IF NOT EXISTS public.job_benchmark_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_title_normalized TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'general',
  benchmark_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_title_normalized, industry)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_job_benchmark_cache_lookup 
  ON job_benchmark_cache (job_title_normalized, industry);

-- Index for cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_job_benchmark_cache_expires 
  ON job_benchmark_cache (expires_at);

-- Enable RLS
ALTER TABLE public.job_benchmark_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read cache (shared across accounts)
CREATE POLICY "Anyone can read benchmark cache"
  ON job_benchmark_cache FOR SELECT
  TO authenticated
  USING (true);

-- Allow edge functions to insert/update cache
CREATE POLICY "Service role can manage benchmark cache"
  ON job_benchmark_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_job_benchmark_cache_updated_at
  BEFORE UPDATE ON job_benchmark_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE job_benchmark_cache IS 'Cache for job market benchmark data from Firecrawl searches';