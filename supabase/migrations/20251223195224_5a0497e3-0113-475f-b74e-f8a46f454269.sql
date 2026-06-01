-- Alterar a coluna development de text para text[]
-- Primeiro, converter valores existentes (string -> array com 1 elemento ou vazio)
ALTER TABLE public.job_descriptions 
  ALTER COLUMN development TYPE text[] 
  USING CASE 
    WHEN development IS NULL OR development = '' THEN ARRAY[]::text[]
    ELSE ARRAY[development]::text[]
  END;