
CREATE TABLE public.recruitment_job_workflow_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  notification_delay_minutes INTEGER NOT NULL DEFAULT 5,
  send_email BOOLEAN NOT NULL DEFAULT true,
  send_whatsapp BOOLEAN NOT NULL DEFAULT false,
  advance_email_template_id UUID NULL,
  advance_whatsapp_template_id UUID NULL,
  complete_email_template_id UUID NULL,
  complete_whatsapp_template_id UUID NULL,
  reject_email_template_id UUID NULL,
  reject_whatsapp_template_id UUID NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id)
);

ALTER TABLE public.recruitment_job_workflow_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can manage workflow config"
  ON public.recruitment_job_workflow_config
  FOR ALL
  USING (is_account_member(auth.uid(), account_id))
  WITH CHECK (is_account_member(auth.uid(), account_id));

CREATE TRIGGER update_workflow_config_updated_at
  BEFORE UPDATE ON public.recruitment_job_workflow_config
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
