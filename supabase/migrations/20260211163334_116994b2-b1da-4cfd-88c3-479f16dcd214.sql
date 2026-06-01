
-- Table: recruitment_whatsapp_config
CREATE TABLE public.recruitment_whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL,
  waba_id TEXT,
  access_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id)
);

ALTER TABLE public.recruitment_whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view whatsapp config"
  ON public.recruitment_whatsapp_config FOR SELECT
  USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Account admins can insert whatsapp config"
  ON public.recruitment_whatsapp_config FOR INSERT
  WITH CHECK (is_account_admin_or_owner(auth.uid(), account_id));

CREATE POLICY "Account admins can update whatsapp config"
  ON public.recruitment_whatsapp_config FOR UPDATE
  USING (is_account_admin_or_owner(auth.uid(), account_id));

CREATE POLICY "Account admins can delete whatsapp config"
  ON public.recruitment_whatsapp_config FOR DELETE
  USING (is_account_admin_or_owner(auth.uid(), account_id));

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_whatsapp_config
  BEFORE UPDATE ON public.recruitment_whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Table: recruitment_scheduled_notifications
CREATE TABLE public.recruitment_scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.recruitment_applications(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  next_step_type TEXT,
  payload JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.recruitment_scheduled_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view scheduled notifications"
  ON public.recruitment_scheduled_notifications FOR SELECT
  USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Account members can insert scheduled notifications"
  ON public.recruitment_scheduled_notifications FOR INSERT
  WITH CHECK (is_account_member(auth.uid(), account_id));

CREATE POLICY "Account members can update scheduled notifications"
  ON public.recruitment_scheduled_notifications FOR UPDATE
  USING (is_account_member(auth.uid(), account_id));

-- Index for the cron processor
CREATE INDEX idx_scheduled_notifications_pending
  ON public.recruitment_scheduled_notifications (status, scheduled_for)
  WHERE status = 'pending';
