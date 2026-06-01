-- Cross-match suggestions table
CREATE TABLE public.recruitment_cross_match_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_result_id UUID REFERENCES public.recruitment_hunting_results(id) ON DELETE CASCADE,
  source_job_id UUID REFERENCES public.recruitment_jobs(id) ON DELETE SET NULL,
  suggested_job_id UUID REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  match_score INTEGER DEFAULT 0,
  reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recruitment_cross_match_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view cross-match suggestions"
  ON public.recruitment_cross_match_suggestions FOR SELECT
  TO authenticated
  USING (public.is_account_member(auth.uid(), account_id) OR public.can_edit_client_project(auth.uid(), account_id));

CREATE POLICY "Members can create cross-match suggestions"
  ON public.recruitment_cross_match_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_account_member(auth.uid(), account_id) OR public.can_edit_client_project(auth.uid(), account_id));

CREATE POLICY "Members can update cross-match suggestions"
  ON public.recruitment_cross_match_suggestions FOR UPDATE
  TO authenticated
  USING (public.is_account_member(auth.uid(), account_id) OR public.can_edit_client_project(auth.uid(), account_id));

CREATE INDEX idx_cross_match_account ON public.recruitment_cross_match_suggestions(account_id);
CREATE INDEX idx_cross_match_result ON public.recruitment_cross_match_suggestions(source_result_id);
CREATE INDEX idx_cross_match_status ON public.recruitment_cross_match_suggestions(status);

-- A/B testing columns on outreach campaigns
ALTER TABLE public.recruitment_outreach_campaigns
  ADD COLUMN ab_variant TEXT,
  ADD COLUMN ab_group_id UUID;

CREATE INDEX idx_outreach_ab_group ON public.recruitment_outreach_campaigns(ab_group_id);

-- Tracking columns on outreach conversations
ALTER TABLE public.recruitment_outreach_conversations
  ADD COLUMN variant TEXT,
  ADD COLUMN opened_at TIMESTAMPTZ,
  ADD COLUMN responded_at TIMESTAMPTZ;