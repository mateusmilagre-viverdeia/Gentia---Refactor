
-- Add new columns to employees table
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS phone text;

-- Drop and recreate the view with new columns
DROP VIEW IF EXISTS public.employees_public;
CREATE VIEW public.employees_public AS
SELECT id, account_id, full_name, email, job_title, department, location, linkedin_url, phone, avatar_url, hire_date, birth_date
FROM public.employees
WHERE is_active = true;
