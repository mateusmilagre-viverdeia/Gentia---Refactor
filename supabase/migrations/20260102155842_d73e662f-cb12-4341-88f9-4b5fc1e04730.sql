-- Add gap analysis fields to evolution_competencies
ALTER TABLE public.evolution_competencies 
ADD COLUMN IF NOT EXISTS has_competency BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS development_deadline DATE,
ADD COLUMN IF NOT EXISTS success_indicators TEXT[];

-- Update competency_type to include new categories
COMMENT ON COLUMN public.evolution_competencies.competency_type IS 'technical, behavioral, technical_required, technical_desired';

-- Create index for faster queries on gaps
CREATE INDEX IF NOT EXISTS idx_evolution_competencies_has_competency 
ON public.evolution_competencies(cycle_id, has_competency);