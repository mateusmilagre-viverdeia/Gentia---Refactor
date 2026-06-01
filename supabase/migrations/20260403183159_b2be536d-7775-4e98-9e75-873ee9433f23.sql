
ALTER TABLE public.job_icps
  ADD COLUMN IF NOT EXISTS target_title TEXT,
  ADD COLUMN IF NOT EXISTS target_companies TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_locations TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS negative_keywords TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS min_hunting_score INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS industry_preferences TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS salary_range_min INTEGER,
  ADD COLUMN IF NOT EXISTS salary_range_max INTEGER;
