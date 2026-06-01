-- =========================================
-- SISTEMA COMPLETO DE TRACKING DE ORIGEM
-- =========================================

-- 1. Create candidate_tracking_events table
CREATE TABLE IF NOT EXISTS public.candidate_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.recruitment_jobs(id) ON DELETE SET NULL,
  application_id UUID REFERENCES public.recruitment_applications(id) ON DELETE SET NULL,
  
  -- Event type
  event_type TEXT NOT NULL,
  
  -- Attribution data (inherited from first touch)
  source TEXT,
  medium TEXT,
  campaign TEXT,
  
  -- Event metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidate_tracking_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Account members can view tracking events"
ON public.candidate_tracking_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_members.account_id = candidate_tracking_events.account_id
    AND account_members.user_id = auth.uid()
    AND account_members.is_active = true
  )
);

CREATE POLICY "Account members can insert tracking events"
ON public.candidate_tracking_events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_members.account_id = candidate_tracking_events.account_id
    AND account_members.user_id = auth.uid()
    AND account_members.is_active = true
  )
);

CREATE POLICY "Service role can manage all tracking events"
ON public.candidate_tracking_events FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracking_events_account ON public.candidate_tracking_events(account_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_candidate ON public.candidate_tracking_events(candidate_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_job ON public.candidate_tracking_events(job_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_type ON public.candidate_tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tracking_events_source ON public.candidate_tracking_events(source);
CREATE INDEX IF NOT EXISTS idx_tracking_events_created ON public.candidate_tracking_events(created_at DESC);

-- 2. Add first/last touch columns to recruitment_candidates
ALTER TABLE public.recruitment_candidates
ADD COLUMN IF NOT EXISTS first_touch_source TEXT,
ADD COLUMN IF NOT EXISTS first_touch_medium TEXT,
ADD COLUMN IF NOT EXISTS first_touch_campaign TEXT,
ADD COLUMN IF NOT EXISTS first_touch_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_touch_source TEXT,
ADD COLUMN IF NOT EXISTS last_touch_medium TEXT,
ADD COLUMN IF NOT EXISTS last_touch_campaign TEXT,
ADD COLUMN IF NOT EXISTS last_touch_at TIMESTAMPTZ;

-- Indexes for touch attribution
CREATE INDEX IF NOT EXISTS idx_candidates_first_touch_source ON public.recruitment_candidates(first_touch_source);
CREATE INDEX IF NOT EXISTS idx_candidates_last_touch_source ON public.recruitment_candidates(last_touch_source);

-- 3. Add consent tracking fields to recruitment_candidate_contact_prefs
ALTER TABLE public.recruitment_candidate_contact_prefs
ADD COLUMN IF NOT EXISTS consent_source TEXT,
ADD COLUMN IF NOT EXISTS consent_channel TEXT,
ADD COLUMN IF NOT EXISTS consent_message TEXT,
ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consent_job_id UUID REFERENCES public.recruitment_jobs(id);

-- Enable realtime for tracking events
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidate_tracking_events;