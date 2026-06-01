ALTER TABLE public.job_distribution_logs 
ADD COLUMN IF NOT EXISTS external_posting_id text;