-- =====================================================
-- SPRINT R1: OUTREACH IA - DATABASE SCHEMA
-- =====================================================

-- 1. Campanhas de Outreach
CREATE TABLE public.recruitment_outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.recruitment_jobs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Configuração de público-alvo
  target_source TEXT NOT NULL DEFAULT 'hunting_results', -- 'hunting_results', 'talent_pool', 'candidates', 'manual'
  target_filters JSONB DEFAULT '{}',
  
  -- Configuração de mensagens
  initial_message_template TEXT NOT NULL,
  follow_up_templates JSONB DEFAULT '[]',
  ai_persona TEXT, -- instruções para IA personalizar respostas
  
  -- Automação
  auto_reply_enabled BOOLEAN DEFAULT true,
  max_auto_replies INTEGER DEFAULT 5,
  reply_delay_minutes INTEGER DEFAULT 5,
  
  -- Limites
  max_contacts INTEGER DEFAULT 100,
  daily_send_limit INTEGER DEFAULT 50,
  
  -- Métricas
  contacts_queued INTEGER DEFAULT 0,
  contacts_sent INTEGER DEFAULT 0,
  responses_received INTEGER DEFAULT 0,
  interested_count INTEGER DEFAULT 0,
  converted_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Conversas de Outreach
CREATE TABLE public.recruitment_outreach_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.recruitment_outreach_campaigns(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Referência ao contato (uma destas será preenchida)
  candidate_id UUID REFERENCES public.recruitment_candidates(id) ON DELETE SET NULL,
  hunting_result_id UUID REFERENCES public.recruitment_hunting_results(id) ON DELETE SET NULL,
  talent_pool_id UUID REFERENCES public.talent_pool(id) ON DELETE SET NULL,
  
  -- Dados de contato
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  
  -- Estado da conversa
  status TEXT DEFAULT 'queued', -- 'queued', 'sent', 'delivered', 'responded', 'interested', 'not_interested', 'converted', 'opted_out', 'failed'
  interest_score INTEGER, -- 0-100, classificado por IA
  interest_reason TEXT,
  
  -- Histórico de mensagens (JSONB array)
  messages JSONB DEFAULT '[]',
  
  -- Contexto IA
  ai_context JSONB DEFAULT '{}',
  ai_replies_count INTEGER DEFAULT 0,
  
  -- Timestamps
  last_message_at TIMESTAMPTZ,
  last_response_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  opted_out_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Fila de Mensagens de Outreach
CREATE TABLE public.recruitment_outreach_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.recruitment_outreach_conversations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  message_type TEXT NOT NULL DEFAULT 'initial', -- 'initial', 'follow_up', 'ai_reply', 'manual'
  message_content TEXT NOT NULL,
  
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed', 'cancelled'
  error_message TEXT,
  zapi_message_id TEXT,
  
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_outreach_campaigns_account ON public.recruitment_outreach_campaigns(account_id);
CREATE INDEX idx_outreach_campaigns_status ON public.recruitment_outreach_campaigns(status);
CREATE INDEX idx_outreach_campaigns_job ON public.recruitment_outreach_campaigns(job_id);

CREATE INDEX idx_outreach_conversations_campaign ON public.recruitment_outreach_conversations(campaign_id);
CREATE INDEX idx_outreach_conversations_account ON public.recruitment_outreach_conversations(account_id);
CREATE INDEX idx_outreach_conversations_status ON public.recruitment_outreach_conversations(status);
CREATE INDEX idx_outreach_conversations_phone ON public.recruitment_outreach_conversations(contact_phone);

CREATE INDEX idx_outreach_queue_conversation ON public.recruitment_outreach_queue(conversation_id);
CREATE INDEX idx_outreach_queue_status ON public.recruitment_outreach_queue(status);
CREATE INDEX idx_outreach_queue_scheduled ON public.recruitment_outreach_queue(scheduled_for) WHERE status = 'pending';

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.recruitment_outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_outreach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_outreach_queue ENABLE ROW LEVEL SECURITY;

-- Campaigns: Members can view/manage their org's campaigns
CREATE POLICY "Members can view org campaigns"
  ON public.recruitment_outreach_campaigns FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Members can create org campaigns"
  ON public.recruitment_outreach_campaigns FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Members can update org campaigns"
  ON public.recruitment_outreach_campaigns FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Members can delete org campaigns"
  ON public.recruitment_outreach_campaigns FOR DELETE
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Conversations: Same pattern
CREATE POLICY "Members can view org conversations"
  ON public.recruitment_outreach_conversations FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Members can manage org conversations"
  ON public.recruitment_outreach_conversations FOR ALL
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Queue: Same pattern
CREATE POLICY "Members can view org queue"
  ON public.recruitment_outreach_queue FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Members can manage org queue"
  ON public.recruitment_outreach_queue FOR ALL
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

CREATE TRIGGER update_outreach_campaigns_updated_at
  BEFORE UPDATE ON public.recruitment_outreach_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_outreach_conversations_updated_at
  BEFORE UPDATE ON public.recruitment_outreach_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- CREDIT COST FOR OUTREACH
-- =====================================================

INSERT INTO public.recruitment_credit_costs (feature_key, credit_type, credits_per_use, description, is_active)
VALUES ('outreach_campaign', 'outreach', 15, 'Campanha de outreach para 100 contatos', true)
ON CONFLICT (feature_key) DO NOTHING;