-- Storage bucket for technical interview audio recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'technical-interview-audio',
  'technical-interview-audio',
  false,
  52428800,
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for the bucket

-- Account members can read audio files from their sessions
CREATE POLICY "Account members can read technical interview audio"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'technical-interview-audio' AND
  EXISTS (
    SELECT 1 FROM public.technical_interview_sessions tis
    JOIN public.account_members am ON am.account_id = tis.account_id
    WHERE tis.audio_storage_path = name
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
);

-- Service role can insert audio files (used by edge functions)
CREATE POLICY "Service role can insert technical interview audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'technical-interview-audio' AND
  auth.jwt() ->> 'role' = 'service_role'
);

-- Service role can update audio files
CREATE POLICY "Service role can update technical interview audio"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'technical-interview-audio' AND
  auth.jwt() ->> 'role' = 'service_role'
);

-- Service role can delete audio files
CREATE POLICY "Service role can delete technical interview audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'technical-interview-audio' AND
  auth.jwt() ->> 'role' = 'service_role'
);