-- Create bucket for careers page assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('careers-assets', 'careers-assets', true);

-- RLS: Anyone can view careers assets (public page)
CREATE POLICY "Public can view careers assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'careers-assets');

-- RLS: Authenticated users can upload careers assets
CREATE POLICY "Authenticated users can upload careers assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'careers-assets' 
  AND auth.role() = 'authenticated'
);

-- RLS: Authenticated users can update careers assets
CREATE POLICY "Authenticated users can update careers assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'careers-assets' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'careers-assets' AND auth.role() = 'authenticated');

-- RLS: Authenticated users can delete careers assets
CREATE POLICY "Authenticated users can delete careers assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'careers-assets' AND auth.role() = 'authenticated');