-- Tabela para registrar todas as decisões automatizadas da IA
-- Usado para compliance, debugging, explainability e auditoria

CREATE TABLE public.recruitment_decision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.recruitment_candidates(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.recruitment_jobs(id) ON DELETE SET NULL,
  application_id UUID REFERENCES public.recruitment_applications(id) ON DELETE SET NULL,
  
  -- Contexto da decisão
  decision_type TEXT NOT NULL, -- 'advance', 'reject', 'threshold_check', 'stage_transition', 'notification'
  step_type TEXT, -- 'cultural', 'disc', 'technical', 'orchestrator', 'manual'
  
  -- Input/Output da decisão
  input_data JSONB NOT NULL DEFAULT '{}', -- Score, threshold, contexto
  output_data JSONB NOT NULL DEFAULT '{}', -- Decisão tomada, próximo passo
  
  -- Resultado
  decision TEXT NOT NULL, -- 'approved', 'rejected', 'pending_review', 'advanced', 'notified'
  score NUMERIC(5,2),
  threshold NUMERIC(5,2),
  justification TEXT, -- Explicação da IA ou motivo da decisão
  
  -- Metadados de execução
  processing_time_ms INTEGER,
  triggered_by TEXT NOT NULL DEFAULT 'orchestrator', -- 'orchestrator', 'webhook', 'manual', 'cron'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.recruitment_decision_log ENABLE ROW LEVEL SECURITY;

-- Policy: Membros da conta podem visualizar logs
CREATE POLICY "Account members can view decision logs"
ON public.recruitment_decision_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = recruitment_decision_log.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
  )
);

-- Policy: Sistema pode inserir (via service role em Edge Functions)
CREATE POLICY "Service role can insert decision logs"
ON public.recruitment_decision_log FOR INSERT
WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_decision_log_account_id ON public.recruitment_decision_log(account_id);
CREATE INDEX idx_decision_log_candidate_id ON public.recruitment_decision_log(candidate_id);
CREATE INDEX idx_decision_log_application_id ON public.recruitment_decision_log(application_id);
CREATE INDEX idx_decision_log_job_id ON public.recruitment_decision_log(job_id);
CREATE INDEX idx_decision_log_created_at ON public.recruitment_decision_log(created_at DESC);
CREATE INDEX idx_decision_log_decision_type ON public.recruitment_decision_log(decision_type);

-- Comentários para documentação
COMMENT ON TABLE public.recruitment_decision_log IS 'Audit log de todas as decisões automatizadas no recrutamento';
COMMENT ON COLUMN public.recruitment_decision_log.decision_type IS 'Tipo: advance, reject, threshold_check, stage_transition, notification';
COMMENT ON COLUMN public.recruitment_decision_log.step_type IS 'Etapa: cultural, disc, technical, orchestrator, manual';
COMMENT ON COLUMN public.recruitment_decision_log.input_data IS 'Dados de entrada usados para tomar a decisão';
COMMENT ON COLUMN public.recruitment_decision_log.output_data IS 'Resultado e próximos passos definidos';
COMMENT ON COLUMN public.recruitment_decision_log.justification IS 'Explicação legível da decisão para auditoria';