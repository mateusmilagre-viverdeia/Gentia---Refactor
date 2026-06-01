-- Phase 4: Positioning columns for drag-and-drop
ALTER TABLE public.org_chart_nodes ADD COLUMN IF NOT EXISTS pos_x DOUBLE PRECISION;
ALTER TABLE public.org_chart_nodes ADD COLUMN IF NOT EXISTS pos_y DOUBLE PRECISION;
ALTER TABLE public.org_chart_nodes ADD COLUMN IF NOT EXISTS width DOUBLE PRECISION;
ALTER TABLE public.org_chart_nodes ADD COLUMN IF NOT EXISTS height DOUBLE PRECISION;

-- Custom connections table for non-hierarchical relationships
CREATE TABLE IF NOT EXISTS public.org_chart_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES public.org_charts(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.org_chart_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.org_chart_nodes(id) ON DELETE CASCADE,
  line_style TEXT DEFAULT 'dashed' CHECK (line_style IN ('solid', 'dashed', 'dotted')),
  label TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_org_chart_connections_chart_id ON public.org_chart_connections(chart_id);
CREATE INDEX IF NOT EXISTS idx_org_chart_connections_source ON public.org_chart_connections(source_node_id);
CREATE INDEX IF NOT EXISTS idx_org_chart_connections_target ON public.org_chart_connections(target_node_id);

-- Enable RLS
ALTER TABLE public.org_chart_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies for connections
CREATE POLICY "Users can view connections of their org charts"
  ON public.org_chart_connections FOR SELECT
  USING (chart_id IN (
    SELECT id FROM public.org_charts 
    WHERE account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can insert connections in their org charts"
  ON public.org_chart_connections FOR INSERT
  WITH CHECK (chart_id IN (
    SELECT id FROM public.org_charts 
    WHERE account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can update connections in their org charts"
  ON public.org_chart_connections FOR UPDATE
  USING (chart_id IN (
    SELECT id FROM public.org_charts 
    WHERE account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can delete connections in their org charts"
  ON public.org_chart_connections FOR DELETE
  USING (chart_id IN (
    SELECT id FROM public.org_charts 
    WHERE account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
  ));