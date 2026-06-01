-- Tabela para tracking de consumo de tokens por entrevista de voz
CREATE TABLE public.interview_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('cultural', 'technical')),
  job_id UUID REFERENCES public.recruitment_jobs(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES public.recruitment_candidates(id) ON DELETE SET NULL,
  
  -- Métricas de Áudio (OpenAI Realtime)
  audio_input_seconds NUMERIC(10,2) DEFAULT 0,
  audio_output_seconds NUMERIC(10,2) DEFAULT 0,
  audio_input_tokens INTEGER DEFAULT 0,
  audio_output_tokens INTEGER DEFAULT 0,
  
  -- Métricas de Texto (Lovable AI - Avaliação)
  text_input_tokens INTEGER DEFAULT 0,
  text_output_tokens INTEGER DEFAULT 0,
  
  -- Custos Calculados (USD)
  audio_input_cost_usd NUMERIC(10,6) DEFAULT 0,
  audio_output_cost_usd NUMERIC(10,6) DEFAULT 0,
  text_cost_usd NUMERIC(10,6) DEFAULT 0,
  total_cost_usd NUMERIC(10,6) DEFAULT 0,
  
  -- Metadados
  model_audio TEXT DEFAULT 'gpt-4o-realtime-preview',
  model_text TEXT DEFAULT 'google/gemini-2.5-flash',
  duration_seconds INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id, session_type)
);

-- Índices para queries de análise
CREATE INDEX idx_interview_token_usage_account ON public.interview_token_usage(account_id);
CREATE INDEX idx_interview_token_usage_type ON public.interview_token_usage(session_type);
CREATE INDEX idx_interview_token_usage_date ON public.interview_token_usage(created_at);
CREATE INDEX idx_interview_token_usage_job ON public.interview_token_usage(job_id);

-- Habilitar RLS
ALTER TABLE public.interview_token_usage ENABLE ROW LEVEL SECURITY;

-- Política para membros da organização visualizarem dados de custo
CREATE POLICY "Account members can view interview token usage"
ON public.interview_token_usage
FOR SELECT
TO authenticated
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Política para edge functions (service role) inserirem dados
CREATE POLICY "Service role can insert interview token usage"
ON public.interview_token_usage
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Comentários
COMMENT ON TABLE public.interview_token_usage IS 'Tracking de consumo de tokens e custos por entrevista de voz';
COMMENT ON COLUMN public.interview_token_usage.audio_input_tokens IS 'Tokens consumidos no áudio de entrada (candidato falando)';
COMMENT ON COLUMN public.interview_token_usage.audio_output_tokens IS 'Tokens consumidos no áudio de saída (AI falando)';
COMMENT ON COLUMN public.interview_token_usage.total_cost_usd IS 'Custo total da entrevista em USD';