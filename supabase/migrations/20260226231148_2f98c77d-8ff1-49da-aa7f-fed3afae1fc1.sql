
-- Create platform_ai_model_config table
CREATE TABLE public.platform_ai_model_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key text UNIQUE NOT NULL,
  service_label text NOT NULL,
  category text NOT NULL,
  current_model text NOT NULL,
  default_model text NOT NULL,
  is_locked boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.platform_ai_model_config ENABLE ROW LEVEL SECURITY;

-- RLS: Only EP Partners members can read
CREATE POLICY "EP Partners members can read AI config"
ON public.platform_ai_model_config
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_members.user_id = auth.uid()
      AND account_members.account_id = '67f66f7a-d9a8-455e-8820-ee836cfe7401'
      AND account_members.is_active = true
  )
);

-- RLS: Only EP Partners admins can update
CREATE POLICY "EP Partners admins can update AI config"
ON public.platform_ai_model_config
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_members.user_id = auth.uid()
      AND account_members.account_id = '67f66f7a-d9a8-455e-8820-ee836cfe7401'
      AND account_members.is_active = true
      AND account_members.role IN ('owner', 'admin')
  )
);

-- Also allow service role to read (for edge functions)
CREATE POLICY "Service role can read AI config"
ON public.platform_ai_model_config
FOR SELECT
TO service_role
USING (true);

-- Seed with all current services
INSERT INTO public.platform_ai_model_config (service_key, service_label, category, current_model, default_model, is_locked) VALUES
  ('culture-interview-complete', 'Avaliação Cultural (Scoring)', 'entrevistas', 'google/gemini-3-pro-preview', 'google/gemini-3-pro-preview', false),
  ('culture-interview-chat', 'Chat Cultural (Entrevista Texto)', 'entrevistas', 'google/gemini-3-flash-preview', 'google/gemini-3-flash-preview', false),
  ('technical-interview-complete', 'Avaliação Técnica (Scoring)', 'entrevistas', 'google/gemini-3-flash-preview', 'google/gemini-3-flash-preview', false),
  ('analyze-social-profile', 'Análise de Perfil Social', 'avaliacao', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash', false),
  ('analyze-disc', 'Análise DISC', 'avaliacao', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash', false),
  ('generate-job-icp', 'Geração de ICP', 'vagas', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash', false),
  ('suggest-job-description', 'Sugestão Job Description', 'vagas', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash', false),
  ('job-benchmark-search', 'Benchmark de Vagas', 'vagas', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash', false),
  ('outreach-generate-reply', 'Outreach - Gerar Resposta', 'outreach', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash', false),
  ('outreach-campaign-start', 'Outreach - Início Campanha', 'outreach', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash', false),
  ('outreach-webhook-receiver', 'Outreach - Webhook', 'outreach', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash', false),
  ('hunting-generate-approach', 'Hunting - Abordagem', 'hunting', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash', false),
  ('send-rejection-whatsapp', 'Rejeição WhatsApp', 'comunicacao', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash', false),
  ('start-culture-session', 'Sessão Cultural (Voz)', 'entrevistas', 'gpt-4o-realtime-preview-2025-06-03', 'gpt-4o-realtime-preview-2025-06-03', true),
  ('start-technical-session', 'Sessão Técnica (Voz)', 'entrevistas', 'gpt-4o-realtime-preview-2024-12-17', 'gpt-4o-realtime-preview-2024-12-17', true),
  ('openai-realtime-session', 'Sessão Realtime', 'entrevistas', 'gpt-4o-realtime-preview-2025-06-03', 'gpt-4o-realtime-preview-2025-06-03', true),
  ('technical-interview-session', 'Sessão Técnica Realtime', 'entrevistas', 'gpt-4o-realtime-preview-2024-12-17', 'gpt-4o-realtime-preview-2024-12-17', true);
