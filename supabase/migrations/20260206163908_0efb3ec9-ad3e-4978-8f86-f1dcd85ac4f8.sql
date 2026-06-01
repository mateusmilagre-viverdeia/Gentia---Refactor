-- Add missing FK constraint: energy_selections.item_id -> energy_catalog.id
-- Using IF NOT EXISTS pattern to avoid error if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'energy_selections_item_id_fkey'
    AND table_name = 'energy_selections'
  ) THEN
    ALTER TABLE energy_selections 
    ADD CONSTRAINT energy_selections_item_id_fkey 
    FOREIGN KEY (item_id) REFERENCES energy_catalog(id);
  END IF;
END $$;