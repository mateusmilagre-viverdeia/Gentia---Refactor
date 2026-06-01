-- Create strategic_projects table
CREATE TABLE public.strategic_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_name TEXT NOT NULL,
  description TEXT,
  perspective TEXT NOT NULL CHECK (perspective IN ('financial', 'customer', 'process', 'people')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.strategic_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own projects"
ON public.strategic_projects FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create own projects"
ON public.strategic_projects FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own projects"
ON public.strategic_projects FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own projects"
ON public.strategic_projects FOR DELETE
USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_strategic_projects_user_id ON public.strategic_projects(user_id);
CREATE INDEX idx_strategic_projects_perspective ON public.strategic_projects(perspective);