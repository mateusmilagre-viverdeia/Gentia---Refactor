ALTER TABLE public.recruiter_copilot_messages
  ADD COLUMN IF NOT EXISTS model_used TEXT,
  ADD COLUMN IF NOT EXISTS tier TEXT;