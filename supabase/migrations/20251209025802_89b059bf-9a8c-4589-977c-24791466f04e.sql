-- Add detail columns to strategic_projects table
ALTER TABLE public.strategic_projects 
ADD COLUMN IF NOT EXISTS importance TEXT,
ADD COLUMN IF NOT EXISTS linked_indicator TEXT,
ADD COLUMN IF NOT EXISTS responsible TEXT,
ADD COLUMN IF NOT EXISTS start_quarter TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_strategic_projects_user_segment ON public.strategic_projects(user_id, segment);