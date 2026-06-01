-- Remove text columns and add user ID references
ALTER TABLE public.evolution_cycles 
  DROP COLUMN IF EXISTS collaborator_name,
  DROP COLUMN IF EXISTS collaborator_email,
  DROP COLUMN IF EXISTS leader_name,
  DROP COLUMN IF EXISTS leader_email;

ALTER TABLE public.evolution_cycles 
  ADD COLUMN collaborator_id UUID NOT NULL REFERENCES public.profiles(id),
  ADD COLUMN leader_id UUID REFERENCES public.profiles(id);

-- Create indexes for performance
CREATE INDEX idx_evolution_cycles_collaborator ON public.evolution_cycles(collaborator_id);
CREATE INDEX idx_evolution_cycles_leader ON public.evolution_cycles(leader_id);