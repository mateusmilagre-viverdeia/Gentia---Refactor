ALTER TABLE energy_selections DROP CONSTRAINT IF EXISTS energy_selections_item_id_fkey;
ALTER TABLE energy_selections ALTER COLUMN item_id TYPE TEXT;