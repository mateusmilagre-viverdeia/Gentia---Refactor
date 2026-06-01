-- Add vacancy_status column to org_chart_nodes table
ALTER TABLE public.org_chart_nodes 
ADD COLUMN vacancy_status TEXT DEFAULT 'active' 
CHECK (vacancy_status IN ('active', 'vacant'));