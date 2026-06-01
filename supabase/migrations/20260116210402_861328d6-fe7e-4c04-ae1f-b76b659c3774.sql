-- Tabela para configurações de notificações de recrutamento
CREATE TABLE public.recruitment_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Configurações de tipos de notificação
  notify_new_applications boolean DEFAULT true,
  notify_pending_evaluations boolean DEFAULT true,
  notify_interview_reminders boolean DEFAULT true,
  notify_stale_jobs boolean DEFAULT true,
  notify_stale_candidates boolean DEFAULT true,
  
  -- Thresholds em dias
  stale_job_days integer DEFAULT 7,
  stale_candidate_days integer DEFAULT 5,
  pending_evaluation_days integer DEFAULT 3,
  
  -- Quem notificar (owner da vaga ou todos da conta)
  notify_owner_only boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(account_id)
);

-- Enable RLS
ALTER TABLE public.recruitment_notification_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their account notification settings"
ON public.recruitment_notification_settings
FOR SELECT
USING (
  account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Admins and owners can manage notification settings"
ON public.recruitment_notification_settings
FOR ALL
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')
  )
);

-- Índices para queries de notificação otimizadas
CREATE INDEX IF NOT EXISTS idx_recruitment_applications_updated_at 
ON public.recruitment_applications(updated_at);

CREATE INDEX IF NOT EXISTS idx_recruitment_jobs_updated_at 
ON public.recruitment_jobs(updated_at);

CREATE INDEX IF NOT EXISTS idx_recruitment_applications_status_updated 
ON public.recruitment_applications(status, updated_at);

CREATE INDEX IF NOT EXISTS idx_culture_interview_sessions_status_created 
ON public.culture_interview_sessions(status, created_at);

-- Trigger para updated_at
CREATE TRIGGER update_recruitment_notification_settings_updated_at
BEFORE UPDATE ON public.recruitment_notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();