-- Add tags and recruiter_notes to hunting results
ALTER TABLE public.recruitment_hunting_results
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recruiter_notes TEXT;

-- Create shortlists table
CREATE TABLE IF NOT EXISTS public.recruitment_shortlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.recruitment_jobs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recruitment_shortlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org shortlists"
  ON public.recruitment_shortlists FOR SELECT
  TO authenticated
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Members can create org shortlists"
  ON public.recruitment_shortlists FOR INSERT
  TO authenticated
  WITH CHECK (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Members can update org shortlists"
  ON public.recruitment_shortlists FOR UPDATE
  TO authenticated
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Members can delete org shortlists"
  ON public.recruitment_shortlists FOR DELETE
  TO authenticated
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
  ));

-- Create shortlist items table
CREATE TABLE IF NOT EXISTS public.recruitment_shortlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shortlist_id UUID NOT NULL REFERENCES public.recruitment_shortlists(id) ON DELETE CASCADE,
  hunting_result_id UUID NOT NULL REFERENCES public.recruitment_hunting_results(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  added_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shortlist_id, hunting_result_id)
);

ALTER TABLE public.recruitment_shortlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view shortlist items"
  ON public.recruitment_shortlist_items FOR SELECT
  TO authenticated
  USING (shortlist_id IN (
    SELECT id FROM public.recruitment_shortlists WHERE account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  ));

CREATE POLICY "Members can manage shortlist items"
  ON public.recruitment_shortlist_items FOR INSERT
  TO authenticated
  WITH CHECK (shortlist_id IN (
    SELECT id FROM public.recruitment_shortlists WHERE account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  ));

CREATE POLICY "Members can update shortlist items"
  ON public.recruitment_shortlist_items FOR UPDATE
  TO authenticated
  USING (shortlist_id IN (
    SELECT id FROM public.recruitment_shortlists WHERE account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  ));

CREATE POLICY "Members can delete shortlist items"
  ON public.recruitment_shortlist_items FOR DELETE
  TO authenticated
  USING (shortlist_id IN (
    SELECT id FROM public.recruitment_shortlists WHERE account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  ));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_shortlist_items_shortlist ON public.recruitment_shortlist_items(shortlist_id);
CREATE INDEX IF NOT EXISTS idx_shortlist_items_result ON public.recruitment_shortlist_items(hunting_result_id);
CREATE INDEX IF NOT EXISTS idx_shortlists_job ON public.recruitment_shortlists(job_id);
CREATE INDEX IF NOT EXISTS idx_shortlists_account ON public.recruitment_shortlists(account_id);
CREATE INDEX IF NOT EXISTS idx_hunting_results_tags ON public.recruitment_hunting_results USING GIN(tags);