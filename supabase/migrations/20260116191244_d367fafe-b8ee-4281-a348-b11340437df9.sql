-- Create table for recruitment activities / timeline
CREATE TABLE public.recruitment_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL,
  application_id UUID REFERENCES public.recruitment_applications(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.recruitment_jobs(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_recruitment_activities_candidate ON public.recruitment_activities(candidate_id);
CREATE INDEX idx_recruitment_activities_account ON public.recruitment_activities(account_id);
CREATE INDEX idx_recruitment_activities_created ON public.recruitment_activities(created_at DESC);
CREATE INDEX idx_recruitment_activities_application ON public.recruitment_activities(application_id);

-- Enable RLS
ALTER TABLE public.recruitment_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view activities in their account"
  ON public.recruitment_activities FOR SELECT
  USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

CREATE POLICY "Users can insert activities in their account"
  ON public.recruitment_activities FOR INSERT
  WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

CREATE POLICY "Users can update activities in their account"
  ON public.recruitment_activities FOR UPDATE
  USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

CREATE POLICY "Users can delete activities in their account"
  ON public.recruitment_activities FOR DELETE
  USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));