
-- Add sort_order column
ALTER TABLE public.ritual_suggestions_catalog
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 100;

-- Deactivate all current Pillar 2 suggestions (old "Tomada de Decisão" content)
UPDATE public.ritual_suggestions_catalog
SET active = false
WHERE pillar_number = 2;
