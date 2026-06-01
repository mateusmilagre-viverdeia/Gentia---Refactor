-- Remove the UNIQUE constraint on user_id to allow users to create multiple organizations
ALTER TABLE public.companies 
DROP CONSTRAINT IF EXISTS companies_user_id_key;