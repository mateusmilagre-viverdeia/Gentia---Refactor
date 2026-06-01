ALTER TABLE energy_selections 
ADD CONSTRAINT energy_selections_item_id_fkey 
FOREIGN KEY (item_id) REFERENCES energy_catalog(id);