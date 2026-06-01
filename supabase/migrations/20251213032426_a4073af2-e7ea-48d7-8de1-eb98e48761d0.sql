-- Add people JSONB column to store multiple people per node
ALTER TABLE public.org_chart_nodes
ADD COLUMN people JSONB DEFAULT '[]';