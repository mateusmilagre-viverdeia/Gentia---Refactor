-- Adicionar novos campos à tabela intranet_posts para dados específicos por tipo
ALTER TABLE public.intranet_posts 
ADD COLUMN IF NOT EXISTS event_date DATE,
ADD COLUMN IF NOT EXISTS new_job_title TEXT,
ADD COLUMN IF NOT EXISTS previous_job_title TEXT,
ADD COLUMN IF NOT EXISTS department TEXT;