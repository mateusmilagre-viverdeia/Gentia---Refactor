
ALTER TABLE public.recruitment_hunting_approaches 
  ADD COLUMN IF NOT EXISTS follow_up_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_follow_up_message text,
  ADD COLUMN IF NOT EXISTS response_classification text,
  ADD COLUMN IF NOT EXISTS response_received_at timestamptz;
