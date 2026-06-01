-- =====================================================
-- M8: WhatsApp/Email Intake Infrastructure
-- =====================================================

-- 1. Table: candidate_external_entries
CREATE TABLE IF NOT EXISTS public.candidate_external_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  sender TEXT NOT NULL,
  sender_name TEXT,
  subject TEXT,
  raw_content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_mime_type TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'duplicate', 'ignored')),
  candidate_id UUID REFERENCES public.recruitment_candidates(id) ON DELETE SET NULL,
  error_message TEXT,
  extracted_data JSONB,
  retry_count INT NOT NULL DEFAULT 0,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_external_entries_account_status ON public.candidate_external_entries(account_id, processing_status, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_entries_channel ON public.candidate_external_entries(account_id, channel, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_entries_candidate ON public.candidate_external_entries(candidate_id) WHERE candidate_id IS NOT NULL;

ALTER TABLE public.candidate_external_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view external entries"
  ON public.candidate_external_entries FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Service role can insert external entries"
  ON public.candidate_external_entries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role and account members can update external entries"
  ON public.candidate_external_entries FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR public.is_super_admin(auth.uid())
    OR auth.role() = 'service_role'
  );

CREATE TRIGGER trg_external_entries_updated_at
  BEFORE UPDATE ON public.candidate_external_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Table: email_intake_config
CREATE TABLE IF NOT EXISTS public.email_intake_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  dedicated_email TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_received INT NOT NULL DEFAULT 0,
  last_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_intake_email ON public.email_intake_config(dedicated_email);

ALTER TABLE public.email_intake_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view email intake config"
  ON public.email_intake_config FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Account admins can update email intake config"
  ON public.email_intake_config FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members
      WHERE user_id = auth.uid() AND is_active = true
        AND role IN ('owner', 'admin', 'admin_rh')
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE TRIGGER trg_email_intake_updated_at
  BEFORE UPDATE ON public.email_intake_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Storage bucket: external-resumes (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('external-resumes', 'external-resumes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Account members can read external resumes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'external-resumes'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT account_id::text FROM public.account_members
        WHERE user_id = auth.uid() AND is_active = true
      )
      OR public.is_super_admin(auth.uid())
    )
  );

CREATE POLICY "Service role can write external resumes"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'external-resumes');

CREATE POLICY "Service role can update external resumes"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'external-resumes');

-- 4. Function to generate slug from company name
CREATE OR REPLACE FUNCTION public.generate_intake_slug(p_account_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_slug TEXT;
  v_final_slug TEXT;
  v_counter INT := 0;
  v_company_name TEXT;
BEGIN
  SELECT COALESCE(slug, name) INTO v_company_name
  FROM public.companies
  WHERE id = p_account_id;

  -- Normalize: lowercase, replace spaces/special with hyphens, max 30 chars
  v_base_slug := lower(regexp_replace(unaccent(COALESCE(v_company_name, 'conta')), '[^a-z0-9]+', '-', 'gi'));
  v_base_slug := trim(both '-' from v_base_slug);
  v_base_slug := substring(v_base_slug from 1 for 30);
  IF v_base_slug = '' OR v_base_slug IS NULL THEN
    v_base_slug := 'conta-' || substr(p_account_id::text, 1, 8);
  END IF;

  v_final_slug := v_base_slug;

  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.email_intake_config WHERE slug = v_final_slug) LOOP
    v_counter := v_counter + 1;
    v_final_slug := v_base_slug || '-' || v_counter::text;
  END LOOP;

  RETURN v_final_slug;
END;
$$;

-- 5. Trigger function: auto-create email_intake_config on new account
CREATE OR REPLACE FUNCTION public.on_company_created_intake()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
BEGIN
  v_slug := public.generate_intake_slug(NEW.id);

  INSERT INTO public.email_intake_config (account_id, dedicated_email, slug, is_active)
  VALUES (
    NEW.id,
    'curriculos-' || v_slug || '@candidatos.gentia.com.br',
    v_slug,
    true
  )
  ON CONFLICT (account_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_intake_setup ON public.companies;
CREATE TRIGGER trg_company_intake_setup
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.on_company_created_intake();

-- 6. Backfill existing accounts (uses ON CONFLICT to be idempotent)
DO $$
DECLARE
  v_company RECORD;
  v_slug TEXT;
BEGIN
  FOR v_company IN
    SELECT c.id FROM public.companies c
    LEFT JOIN public.email_intake_config e ON e.account_id = c.id
    WHERE e.id IS NULL
  LOOP
    BEGIN
      v_slug := public.generate_intake_slug(v_company.id);
      INSERT INTO public.email_intake_config (account_id, dedicated_email, slug, is_active)
      VALUES (
        v_company.id,
        'curriculos-' || v_slug || '@candidatos.gentia.com.br',
        v_slug,
        true
      )
      ON CONFLICT (account_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped backfill for account %: %', v_company.id, SQLERRM;
    END;
  END LOOP;
END $$;