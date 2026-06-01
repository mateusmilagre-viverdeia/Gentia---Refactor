
ALTER TABLE public.job_icps ADD COLUMN IF NOT EXISTS company_size_ranges text[] DEFAULT '{}';
ALTER TABLE public.job_icps ADD COLUMN IF NOT EXISTS openness_signals text[] DEFAULT '{}';
ALTER TABLE public.job_icps ADD COLUMN IF NOT EXISTS excluded_current_titles text[] DEFAULT '{}';
ALTER TABLE public.job_icps ADD COLUMN IF NOT EXISTS valued_previous_roles text[] DEFAULT '{}';
ALTER TABLE public.job_icps ADD COLUMN IF NOT EXISTS negative_trajectory_patterns text[] DEFAULT '{}';
ALTER TABLE public.job_icps ADD COLUMN IF NOT EXISTS reference_companies text[] DEFAULT '{}';
ALTER TABLE public.job_icps ADD COLUMN IF NOT EXISTS tenure_min_months integer DEFAULT NULL;
ALTER TABLE public.job_icps ADD COLUMN IF NOT EXISTS tenure_penalty text DEFAULT 'ignore';
