-- Create storage bucket for culture interview audio recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('culture-interview-audio', 'culture-interview-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Allow service role to upload to the bucket
CREATE POLICY "Service role can upload culture interview audio"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'culture-interview-audio');

-- Allow authenticated users to read their own organization's audio
CREATE POLICY "Users can read their org culture interview audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'culture-interview-audio' 
  AND (storage.foldername(name))[1] IN (
    SELECT account_id::text FROM account_members WHERE user_id = auth.uid()
  )
);

-- Add audio columns to culture_interview_sessions
ALTER TABLE culture_interview_sessions 
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS audio_storage_path TEXT;

-- Add timestamp columns to culture_interview_responses for exact timing
ALTER TABLE culture_interview_responses
ADD COLUMN IF NOT EXISTS start_seconds NUMERIC,
ADD COLUMN IF NOT EXISTS end_seconds NUMERIC;

-- Add column for full AI question text (what was actually spoken)
ALTER TABLE culture_interview_responses
ADD COLUMN IF NOT EXISTS ai_question_spoken TEXT;