-- Add deleted_at column for soft delete on energy_sessions
ALTER TABLE public.energy_sessions 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add deleted_at column for soft delete on development_sessions
ALTER TABLE public.development_sessions 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient filtering of non-deleted sessions
CREATE INDEX IF NOT EXISTS idx_energy_sessions_not_deleted 
ON public.energy_sessions (account_id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_development_sessions_not_deleted 
ON public.development_sessions (account_id) 
WHERE deleted_at IS NULL;