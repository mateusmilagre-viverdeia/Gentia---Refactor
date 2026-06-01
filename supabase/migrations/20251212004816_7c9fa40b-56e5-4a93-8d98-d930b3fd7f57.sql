-- Add website and instagram columns to companies table
ALTER TABLE public.companies
ADD COLUMN website text,
ADD COLUMN instagram text;