-- Add min_hunting_score column to recruitment_jobs
ALTER TABLE public.recruitment_jobs
ADD COLUMN IF NOT EXISTS min_hunting_score INTEGER DEFAULT 0;

COMMENT ON COLUMN public.recruitment_jobs.min_hunting_score IS 
'Score mínimo de hunting (0-100) para candidatos serem incluídos em campanhas de abordagem';