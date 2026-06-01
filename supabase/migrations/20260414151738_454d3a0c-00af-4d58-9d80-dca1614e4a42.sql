ALTER TABLE development_selections DROP CONSTRAINT IF EXISTS development_selections_item_id_fkey;
ALTER TABLE development_selections ALTER COLUMN item_id TYPE TEXT;
ALTER TABLE development_selections ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE development_selections ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE development_selections ADD COLUMN IF NOT EXISTS category_label TEXT;