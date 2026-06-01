-- Add first_name and last_name columns to candidate_profiles
ALTER TABLE public.candidate_profiles 
ADD COLUMN first_name text,
ADD COLUMN last_name text;

-- Update existing records: split full_name into first_name and last_name
UPDATE public.candidate_profiles
SET 
  first_name = SPLIT_PART(full_name, ' ', 1),
  last_name = CASE 
    WHEN POSITION(' ' IN full_name) > 0 
    THEN SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
    ELSE NULL
  END
WHERE first_name IS NULL;