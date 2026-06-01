-- Add smart search columns to recruitment_hunting_results
ALTER TABLE public.recruitment_hunting_results
  ADD COLUMN IF NOT EXISTS score_source text DEFAULT 'preview',
  ADD COLUMN IF NOT EXISTS qualified boolean DEFAULT false;

-- Add smart search columns to recruitment_hunting_searches
ALTER TABLE public.recruitment_hunting_searches
  ADD COLUMN IF NOT EXISTS desired_count integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS min_score integer DEFAULT 70,
  ADD COLUMN IF NOT EXISTS qualified_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS search_rounds integer DEFAULT 0;

-- Enable realtime for hunting results
ALTER PUBLICATION supabase_realtime ADD TABLE public.recruitment_hunting_results;