-- =============================================
-- FASE 6A: EXPANSÃO DO BACKEND PARA MÉTODO EP+
-- =============================================

-- 1. Adicionar novos tipos de responsáveis ao enum
ALTER TYPE onboarding_responsible_type ADD VALUE IF NOT EXISTS 'ti';
ALTER TYPE onboarding_responsible_type ADD VALUE IF NOT EXISTS 'buddy';

-- 2. Criar enum para status de checkpoint
CREATE TYPE onboarding_checkpoint_status AS ENUM ('pending', 'completed', 'at_risk', 'attention');

-- 3. Criar enum para tipo de respondente de checkpoint
CREATE TYPE onboarding_respondent_type AS ENUM ('employee', 'leader');

-- 4. Criar enum para tipos de alerta
CREATE TYPE onboarding_alert_type AS ENUM (
  'task_delayed',
  'checkpoint_at_risk', 
  'low_evaluation_score',
  'missing_leader_feedback',
  'onboarding_not_closed',
  'checkpoint_pending'
);

-- 5. Criar enum para severidade de alerta
CREATE TYPE onboarding_alert_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- 6. Expandir enum de recomendação
ALTER TYPE onboarding_recommendation ADD VALUE IF NOT EXISTS 'aprovado';
ALTER TYPE onboarding_recommendation ADD VALUE IF NOT EXISTS 'aprovado_ressalvas';
ALTER TYPE onboarding_recommendation ADD VALUE IF NOT EXISTS 'replanejar';
ALTER TYPE onboarding_recommendation ADD VALUE IF NOT EXISTS 'nao_aprovado';

-- 7. Criar tabela de checkpoints
CREATE TABLE public.onboarding_checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.onboarding_processes(id) ON DELETE CASCADE,
  checkpoint_day INTEGER NOT NULL, -- 7, 30, 60, 90
  name TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  status onboarding_checkpoint_status NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(process_id, checkpoint_day)
);

-- 8. Criar tabela de respostas de checkpoint
CREATE TABLE public.onboarding_checkpoint_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checkpoint_id UUID NOT NULL REFERENCES public.onboarding_checkpoints(id) ON DELETE CASCADE,
  respondent_type onboarding_respondent_type NOT NULL,
  respondent_id UUID,
  respondent_name TEXT,
  -- Respostas específicas (0-10)
  feeling_score INTEGER CHECK (feeling_score >= 0 AND feeling_score <= 10),
  role_clarity_score INTEGER CHECK (role_clarity_score >= 0 AND role_clarity_score <= 10),
  team_integration_score INTEGER CHECK (team_integration_score >= 0 AND team_integration_score <= 10),
  work_preparation_score INTEGER CHECK (work_preparation_score >= 0 AND work_preparation_score <= 10),
  delivery_quality_score INTEGER CHECK (delivery_quality_score >= 0 AND delivery_quality_score <= 10),
  culture_adherence_score INTEGER CHECK (culture_adherence_score >= 0 AND culture_adherence_score <= 10),
  autonomy_score INTEGER CHECK (autonomy_score >= 0 AND autonomy_score <= 10),
  additional_notes TEXT,
  overall_score DECIMAL(3,1),
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(checkpoint_id, respondent_type)
);

-- 9. Criar tabela de alertas
CREATE TABLE public.onboarding_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.onboarding_processes(id) ON DELETE CASCADE,
  alert_type onboarding_alert_type NOT NULL,
  severity onboarding_alert_severity NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  message TEXT,
  related_task_id UUID REFERENCES public.onboarding_tasks(id) ON DELETE SET NULL,
  related_checkpoint_id UUID REFERENCES public.onboarding_checkpoints(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Adicionar campos expandidos à tabela de avaliações
ALTER TABLE public.onboarding_evaluations 
  ADD COLUMN IF NOT EXISTS clarity_rating INTEGER CHECK (clarity_rating >= 0 AND clarity_rating <= 10),
  ADD COLUMN IF NOT EXISTS culture_rating INTEGER CHECK (culture_rating >= 0 AND culture_rating <= 10),
  ADD COLUMN IF NOT EXISTS autonomy_rating INTEGER CHECK (autonomy_rating >= 0 AND autonomy_rating <= 10),
  ADD COLUMN IF NOT EXISTS delivery_rating INTEGER CHECK (delivery_rating >= 0 AND delivery_rating <= 10),
  ADD COLUMN IF NOT EXISTS integration_rating INTEGER CHECK (integration_rating >= 0 AND integration_rating <= 10),
  ADD COLUMN IF NOT EXISTS readiness_summary TEXT;

-- 11. Criar tabela de métricas de sucesso customizáveis
CREATE TABLE public.onboarding_success_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.onboarding_processes(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_description TEXT,
  target_value TEXT,
  achieved_value TEXT,
  is_achieved BOOLEAN,
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Habilitar RLS
ALTER TABLE public.onboarding_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_checkpoint_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_success_metrics ENABLE ROW LEVEL SECURITY;

-- 13. Políticas RLS para checkpoints (usando mesma lógica que onboarding_processes)
CREATE POLICY "Checkpoints viewable by involved users"
  ON public.onboarding_checkpoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_processes op
      WHERE op.id = process_id
      AND (
        auth.uid() = op.created_by
        OR auth.uid() = op.leader_id
        OR auth.uid() = op.hr_responsible_id
        OR is_super_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Checkpoints manageable by involved users"
  ON public.onboarding_checkpoints FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_processes op
      WHERE op.id = process_id
      AND (
        auth.uid() = op.created_by
        OR auth.uid() = op.leader_id
        OR auth.uid() = op.hr_responsible_id
        OR is_super_admin(auth.uid())
      )
    )
  );

-- 14. Políticas RLS para respostas de checkpoint
CREATE POLICY "Checkpoint responses viewable by involved users"
  ON public.onboarding_checkpoint_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_checkpoints oc
      JOIN public.onboarding_processes op ON op.id = oc.process_id
      WHERE oc.id = checkpoint_id
      AND (
        auth.uid() = op.created_by
        OR auth.uid() = op.leader_id
        OR auth.uid() = op.hr_responsible_id
        OR is_super_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Checkpoint responses insertable by involved users"
  ON public.onboarding_checkpoint_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.onboarding_checkpoints oc
      JOIN public.onboarding_processes op ON op.id = oc.process_id
      WHERE oc.id = checkpoint_id
      AND (
        auth.uid() = op.created_by
        OR auth.uid() = op.leader_id
        OR auth.uid() = op.hr_responsible_id
        OR is_super_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Checkpoint responses updatable by respondent or admins"
  ON public.onboarding_checkpoint_responses FOR UPDATE
  USING (
    respondent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.onboarding_checkpoints oc
      JOIN public.onboarding_processes op ON op.id = oc.process_id
      WHERE oc.id = checkpoint_id
      AND (
        auth.uid() = op.created_by
        OR auth.uid() = op.hr_responsible_id
        OR is_super_admin(auth.uid())
      )
    )
  );

-- 15. Políticas RLS para alertas
CREATE POLICY "Alerts viewable by involved users"
  ON public.onboarding_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_processes op
      WHERE op.id = process_id
      AND (
        auth.uid() = op.created_by
        OR auth.uid() = op.leader_id
        OR auth.uid() = op.hr_responsible_id
        OR is_super_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Alerts manageable by involved users"
  ON public.onboarding_alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_processes op
      WHERE op.id = process_id
      AND (
        auth.uid() = op.created_by
        OR auth.uid() = op.leader_id
        OR auth.uid() = op.hr_responsible_id
        OR is_super_admin(auth.uid())
      )
    )
  );

-- 16. Políticas RLS para métricas de sucesso
CREATE POLICY "Success metrics viewable by involved users"
  ON public.onboarding_success_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_processes op
      WHERE op.id = process_id
      AND (
        auth.uid() = op.created_by
        OR auth.uid() = op.leader_id
        OR auth.uid() = op.hr_responsible_id
        OR is_super_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Success metrics manageable by involved users"
  ON public.onboarding_success_metrics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_processes op
      WHERE op.id = process_id
      AND (
        auth.uid() = op.created_by
        OR auth.uid() = op.leader_id
        OR auth.uid() = op.hr_responsible_id
        OR is_super_admin(auth.uid())
      )
    )
  );

-- 17. Criar índices para performance
CREATE INDEX idx_onboarding_checkpoints_process ON public.onboarding_checkpoints(process_id);
CREATE INDEX idx_onboarding_checkpoints_status ON public.onboarding_checkpoints(status);
CREATE INDEX idx_onboarding_checkpoint_responses_checkpoint ON public.onboarding_checkpoint_responses(checkpoint_id);
CREATE INDEX idx_onboarding_alerts_process ON public.onboarding_alerts(process_id);
CREATE INDEX idx_onboarding_alerts_unread ON public.onboarding_alerts(process_id) WHERE is_read = false;
CREATE INDEX idx_onboarding_success_metrics_process ON public.onboarding_success_metrics(process_id);

-- 18. Trigger para updated_at nos checkpoints
CREATE TRIGGER update_onboarding_checkpoints_updated_at
  BEFORE UPDATE ON public.onboarding_checkpoints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();