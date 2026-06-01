-- Add new columns for the 8 selling content sections
ALTER TABLE careers_page_settings 
ADD COLUMN IF NOT EXISTS show_opening_section boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_fit_section boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_offerings_section boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_cta_section boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN careers_page_settings.show_opening_section IS 'Toggle for ✨ Abertura Inicial section';
COMMENT ON COLUMN careers_page_settings.show_fit_section IS 'Toggle for 🤝 Nosso Santo Vai Bater Se... section';
COMMENT ON COLUMN careers_page_settings.show_offerings_section IS 'Toggle for 🎁 O Que Você Encontra Aqui section';
COMMENT ON COLUMN careers_page_settings.show_cta_section IS 'Toggle for 🎯 CTA Emocional section';