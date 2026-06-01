-- Add is_custom column to strategic_projects table
ALTER TABLE public.strategic_projects 
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT true;

-- Add segment column to track selected segment per user
ALTER TABLE public.strategic_projects 
ADD COLUMN IF NOT EXISTS segment TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_strategic_projects_segment ON public.strategic_projects(segment);
CREATE INDEX IF NOT EXISTS idx_strategic_projects_is_custom ON public.strategic_projects(is_custom);