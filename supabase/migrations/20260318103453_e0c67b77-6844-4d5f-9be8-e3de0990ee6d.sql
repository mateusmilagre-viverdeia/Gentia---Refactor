ALTER TABLE public.platform_whatsapp_config
  ADD COLUMN IF NOT EXISTS template_advancement_name TEXT,
  ADD COLUMN IF NOT EXISTS template_advancement_language TEXT DEFAULT 'pt_BR',
  ADD COLUMN IF NOT EXISTS template_completion_name TEXT,
  ADD COLUMN IF NOT EXISTS template_completion_language TEXT DEFAULT 'pt_BR',
  ADD COLUMN IF NOT EXISTS template_rejection_name TEXT,
  ADD COLUMN IF NOT EXISTS template_rejection_language TEXT DEFAULT 'pt_BR';