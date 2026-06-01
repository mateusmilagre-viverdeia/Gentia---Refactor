-- Add tags column to org_chart_nodes
ALTER TABLE public.org_chart_nodes
ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;