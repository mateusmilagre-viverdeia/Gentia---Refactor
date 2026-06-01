-- Create hunting_search_templates table
CREATE TABLE public.hunting_search_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  boolean_query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hunting_search_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view templates"
  ON public.hunting_search_templates FOR SELECT
  TO authenticated
  USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Account members can create templates"
  ON public.hunting_search_templates FOR INSERT
  TO authenticated
  WITH CHECK (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Account members can update templates"
  ON public.hunting_search_templates FOR UPDATE
  TO authenticated
  USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Account members can delete templates"
  ON public.hunting_search_templates FOR DELETE
  TO authenticated
  USING (public.is_account_member(auth.uid(), account_id));

CREATE INDEX idx_hunting_search_templates_account ON public.hunting_search_templates(account_id);

-- Add recurring columns to recruitment_hunting_searches
ALTER TABLE public.recruitment_hunting_searches
  ADD COLUMN IF NOT EXISTS recurring_schedule TEXT,
  ADD COLUMN IF NOT EXISTS recurring_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_recurring_run TIMESTAMPTZ;