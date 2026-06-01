-- Create org_charts table
CREATE TABLE public.org_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create org_chart_nodes table
CREATE TABLE public.org_chart_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES public.org_charts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.org_chart_nodes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  person_name TEXT,
  person_avatar TEXT,
  roles TEXT[] DEFAULT '{}',
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.org_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_chart_nodes ENABLE ROW LEVEL SECURITY;

-- RLS policies for org_charts
CREATE POLICY "Members can view account org charts"
ON public.org_charts FOR SELECT
USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can create account org charts"
ON public.org_charts FOR INSERT
WITH CHECK (is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can update account org charts"
ON public.org_charts FOR UPDATE
USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can delete account org charts"
ON public.org_charts FOR DELETE
USING (is_account_member(auth.uid(), account_id));

-- RLS policies for org_chart_nodes
CREATE POLICY "Members can view org chart nodes"
ON public.org_chart_nodes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.org_charts oc
  WHERE oc.id = org_chart_nodes.chart_id
  AND is_account_member(auth.uid(), oc.account_id)
));

CREATE POLICY "Members can create org chart nodes"
ON public.org_chart_nodes FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.org_charts oc
  WHERE oc.id = org_chart_nodes.chart_id
  AND is_account_member(auth.uid(), oc.account_id)
));

CREATE POLICY "Members can update org chart nodes"
ON public.org_chart_nodes FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.org_charts oc
  WHERE oc.id = org_chart_nodes.chart_id
  AND is_account_member(auth.uid(), oc.account_id)
));

CREATE POLICY "Members can delete org chart nodes"
ON public.org_chart_nodes FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.org_charts oc
  WHERE oc.id = org_chart_nodes.chart_id
  AND is_account_member(auth.uid(), oc.account_id)
));