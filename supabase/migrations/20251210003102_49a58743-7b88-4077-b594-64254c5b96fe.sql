-- Add metadata columns to ritual_suggestions_catalog
ALTER TABLE ritual_suggestions_catalog 
ADD COLUMN IF NOT EXISTS duration TEXT CHECK (duration IN ('rapido', 'medio', 'longo')),
ADD COLUMN IF NOT EXISTS complexity TEXT CHECK (complexity IN ('facil', 'complexo')),
ADD COLUMN IF NOT EXISTS format TEXT CHECK (format IN ('sincrono', 'assincrono'));