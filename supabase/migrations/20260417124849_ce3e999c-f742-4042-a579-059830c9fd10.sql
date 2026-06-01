-- 1. Add optional senha_hash column for future password auth
ALTER TABLE public.portal_clientes_acesso
  ADD COLUMN IF NOT EXISTS senha_hash TEXT;

-- 2. Create public bucket for consultancy logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('consultancy-logos', 'consultancy-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies for consultancy-logos
-- Public read
DROP POLICY IF EXISTS "Consultancy logos are publicly accessible" ON storage.objects;
CREATE POLICY "Consultancy logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'consultancy-logos');

-- Account members can upload to their account folder (path: {account_id}/...)
DROP POLICY IF EXISTS "Account members can upload consultancy logos" ON storage.objects;
CREATE POLICY "Account members can upload consultancy logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'consultancy-logos'
  AND EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id::text = (storage.foldername(name))[1]
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
);

DROP POLICY IF EXISTS "Account members can update consultancy logos" ON storage.objects;
CREATE POLICY "Account members can update consultancy logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'consultancy-logos'
  AND EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id::text = (storage.foldername(name))[1]
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
);

DROP POLICY IF EXISTS "Account members can delete consultancy logos" ON storage.objects;
CREATE POLICY "Account members can delete consultancy logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'consultancy-logos'
  AND EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id::text = (storage.foldername(name))[1]
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
);

-- 4. Add notification settings columns to consultancy_portal_settings
ALTER TABLE public.consultancy_portal_settings
  ADD COLUMN IF NOT EXISTS notify_shortlist_ready BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_reminder_48h BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_candidate_approved BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS template_shortlist_ready TEXT,
  ADD COLUMN IF NOT EXISTS template_reminder_48h TEXT,
  ADD COLUMN IF NOT EXISTS template_candidate_approved TEXT;