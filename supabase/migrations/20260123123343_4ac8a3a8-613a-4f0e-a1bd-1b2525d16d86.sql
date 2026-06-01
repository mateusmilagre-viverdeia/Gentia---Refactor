-- Allow decimal minimum score (0.0–10.0)
ALTER TABLE public.recruitment_agents
  ALTER COLUMN minimum_score TYPE numeric(3,1)
  USING minimum_score::numeric;

-- Keep a sensible default (existing rows unaffected)
ALTER TABLE public.recruitment_agents
  ALTER COLUMN minimum_score SET DEFAULT 7.0;