
-- Add per-step template columns
ALTER TABLE public.platform_whatsapp_config
  ADD COLUMN IF NOT EXISTS template_cultural_name TEXT,
  ADD COLUMN IF NOT EXISTS template_cultural_language TEXT DEFAULT 'pt_BR',
  ADD COLUMN IF NOT EXISTS template_disc_name TEXT,
  ADD COLUMN IF NOT EXISTS template_disc_language TEXT DEFAULT 'pt_BR',
  ADD COLUMN IF NOT EXISTS template_technical_name TEXT,
  ADD COLUMN IF NOT EXISTS template_technical_language TEXT DEFAULT 'pt_BR';

-- Migrate existing advancement data to all 3 new columns as fallback
UPDATE public.platform_whatsapp_config
SET
  template_cultural_name = template_advancement_name,
  template_cultural_language = COALESCE(template_advancement_language, 'pt_BR'),
  template_disc_name = template_advancement_name,
  template_disc_language = COALESCE(template_advancement_language, 'pt_BR'),
  template_technical_name = template_advancement_name,
  template_technical_language = COALESCE(template_advancement_language, 'pt_BR')
WHERE template_advancement_name IS NOT NULL;

-- Drop old advancement columns
ALTER TABLE public.platform_whatsapp_config
  DROP COLUMN IF EXISTS template_advancement_name,
  DROP COLUMN IF EXISTS template_advancement_language;
