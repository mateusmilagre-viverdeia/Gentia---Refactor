ALTER TABLE public.ritual_sessions 
ADD COLUMN IF NOT EXISTS management_rituals JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_management_recommendations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_final_recommendations JSONB DEFAULT '[]'::jsonb;