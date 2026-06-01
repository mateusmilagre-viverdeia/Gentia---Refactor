
-- Add Evaboot fallback columns to recruitment_hunting_searches
ALTER TABLE public.recruitment_hunting_searches 
  ADD COLUMN IF NOT EXISTS evaboot_job_id text,
  ADD COLUMN IF NOT EXISTS evaboot_status text;

-- Enable realtime for hunting searches (for stepper UI)
ALTER PUBLICATION supabase_realtime ADD TABLE public.recruitment_hunting_searches;
