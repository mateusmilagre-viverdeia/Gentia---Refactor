ALTER TABLE public.recruitment_agents
ADD COLUMN IF NOT EXISTS last_values_sync_at TIMESTAMPTZ;