ALTER TABLE public.implementation_plans ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE public.implementation_plans ADD COLUMN IF NOT EXISTS additional_info TEXT;