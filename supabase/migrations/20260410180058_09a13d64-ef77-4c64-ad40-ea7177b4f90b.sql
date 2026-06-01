
-- Drop FK to allow custom item IDs
ALTER TABLE energy_selections DROP CONSTRAINT IF EXISTS energy_selections_item_id_fkey;

-- Add inline columns
ALTER TABLE energy_selections 
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS category_label text;

-- Backfill existing data from catalog
UPDATE energy_selections es
SET label = ec.label, category = ec.category, category_label = ec.category_label
FROM energy_catalog ec WHERE ec.id = es.item_id;
