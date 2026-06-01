-- Add step_type column to hiring_funnel_stages to connect visual stages with automation
ALTER TABLE public.hiring_funnel_stages 
ADD COLUMN IF NOT EXISTS step_type text DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.hiring_funnel_stages.step_type IS 
  'Automation type linked to this stage: cultural, disc, technical, or null for manual stages';

-- Create index for faster lookups by step_type
CREATE INDEX IF NOT EXISTS idx_hiring_funnel_stages_step_type 
ON public.hiring_funnel_stages(step_type) WHERE step_type IS NOT NULL;

-- Insert default rejection template if not exists
INSERT INTO public.recruitment_message_templates (
  account_id,
  name,
  channel,
  message_type,
  subject,
  body,
  is_default,
  is_active
)
SELECT 
  id as account_id,
  'Rejeição Automática' as name,
  'email' as channel,
  'rejection_auto' as message_type,
  'Sobre sua candidatura na {{company_name}}' as subject,
  'Olá {{candidate_name}},

Agradecemos seu interesse na vaga de {{job_title}} na {{company_name}}.

Após avaliação cuidadosa do seu perfil, decidimos não prosseguir com sua candidatura neste momento.

Desejamos muito sucesso em sua jornada profissional!

Atenciosamente,
Equipe {{company_name}}' as body,
  true as is_default,
  true as is_active
FROM public.companies
WHERE NOT EXISTS (
  SELECT 1 FROM public.recruitment_message_templates 
  WHERE message_type = 'rejection_auto' AND channel = 'email'
)
ON CONFLICT DO NOTHING;