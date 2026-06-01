-- Add avatar_url and cv_url columns to candidate_profiles
ALTER TABLE public.candidate_profiles
ADD COLUMN avatar_url TEXT,
ADD COLUMN cv_url TEXT;

-- Create storage bucket for candidate files
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-files', 'candidate-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for candidate files bucket
CREATE POLICY "Users can upload their own candidate files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'candidate-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own candidate files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'candidate-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own candidate files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'candidate-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Candidate files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'candidate-files');