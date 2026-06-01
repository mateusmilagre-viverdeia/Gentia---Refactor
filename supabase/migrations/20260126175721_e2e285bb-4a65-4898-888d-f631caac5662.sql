-- =====================================================
-- TABELA: recruitment_hunting_approaches
-- Rastreia abordagens personalizadas geradas por IA
-- =====================================================

CREATE TABLE public.recruitment_hunting_approaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunting_result_id UUID NOT NULL REFERENCES public.recruitment_hunting_results(id) ON DELETE CASCADE,
  icp_id UUID REFERENCES public.job_icps(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Mensagens
  message_generated TEXT NOT NULL,
  message_sent TEXT,
  
  -- Canal e status
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'sent', 'failed', 'responded')),
  
  -- Rastreamento
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  sent_at TIMESTAMPTZ,
  response_received_at TIMESTAMPTZ,
  
  -- Integração com outreach
  conversation_id UUID REFERENCES public.recruitment_outreach_conversations(id) ON DELETE SET NULL,
  
  -- Metadados
  phone_number TEXT,
  generation_model TEXT,
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Índices
CREATE INDEX idx_hunting_approaches_result ON public.recruitment_hunting_approaches(hunting_result_id);
CREATE INDEX idx_hunting_approaches_account ON public.recruitment_hunting_approaches(account_id);
CREATE INDEX idx_hunting_approaches_status ON public.recruitment_hunting_approaches(status);

-- RLS
ALTER TABLE public.recruitment_hunting_approaches ENABLE ROW LEVEL SECURITY;

-- Policy: Membros da conta podem visualizar
CREATE POLICY "Account members can view approaches"
ON public.recruitment_hunting_approaches
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_members.account_id = recruitment_hunting_approaches.account_id
    AND account_members.user_id = auth.uid()
    AND account_members.is_active = true
  )
);

-- Policy: Membros da conta podem criar
CREATE POLICY "Account members can create approaches"
ON public.recruitment_hunting_approaches
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_members.account_id = recruitment_hunting_approaches.account_id
    AND account_members.user_id = auth.uid()
    AND account_members.is_active = true
  )
);

-- Policy: Membros da conta podem atualizar
CREATE POLICY "Account members can update approaches"
ON public.recruitment_hunting_approaches
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_members.account_id = recruitment_hunting_approaches.account_id
    AND account_members.user_id = auth.uid()
    AND account_members.is_active = true
  )
);

-- Índice único para evitar múltiplas abordagens ao mesmo resultado
CREATE UNIQUE INDEX idx_hunting_approaches_unique_result 
ON public.recruitment_hunting_approaches(hunting_result_id) 
WHERE status NOT IN ('failed');