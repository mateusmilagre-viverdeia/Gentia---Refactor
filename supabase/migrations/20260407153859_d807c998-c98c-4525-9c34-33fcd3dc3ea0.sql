ALTER TABLE public.recruitment_hunting_searches 
  DROP CONSTRAINT recruitment_hunting_searches_status_check;

ALTER TABLE public.recruitment_hunting_searches 
  ADD CONSTRAINT recruitment_hunting_searches_status_check 
  CHECK (status = ANY (ARRAY['pending', 'running', 'completed', 'failed', 'cancelled']));