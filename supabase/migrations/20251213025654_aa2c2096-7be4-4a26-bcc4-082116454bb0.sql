-- Create avatars bucket for org chart photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload avatars
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow public read access to avatars
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- Allow users to delete avatars
CREATE POLICY "Users can delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');