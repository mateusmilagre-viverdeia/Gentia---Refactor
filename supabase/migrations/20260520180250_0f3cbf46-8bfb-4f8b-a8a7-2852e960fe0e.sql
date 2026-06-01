ALTER TABLE public.values_questions_items
  ADD COLUMN IF NOT EXISTS requires_thinking_time boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.values_questions_items.requires_thinking_time IS
  'Quando true, a IA da entrevista cultural aguarda silêncio extra (4s+) antes de assumir que o candidato terminou de responder.';