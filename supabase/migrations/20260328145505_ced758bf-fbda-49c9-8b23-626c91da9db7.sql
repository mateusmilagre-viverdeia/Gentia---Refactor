ALTER TABLE public.job_icps 
ADD COLUMN IF NOT EXISTS learned_patterns jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS approved_candidates_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_calibrated_at timestamptz DEFAULT NULL;