
-- Tabela de páginas de carreiras white-label por cliente
CREATE TABLE public.client_career_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL UNIQUE REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  logo_url TEXT,
  cover_image_url TEXT,
  primary_color TEXT DEFAULT '#0F172A',
  secondary_color TEXT DEFAULT '#3B82F6',
  company_description TEXT,
  custom_domain TEXT UNIQUE,
  custom_domain_verified BOOLEAN NOT NULL DEFAULT false,
  custom_domain_cname TEXT,
  meta_title TEXT,
  meta_description TEXT,
  total_views INTEGER NOT NULL DEFAULT 0,
  total_applications INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_career_pages_account ON public.client_career_pages(account_id);
CREATE INDEX idx_client_career_pages_slug ON public.client_career_pages(slug);
CREATE INDEX idx_client_career_pages_active ON public.client_career_pages(is_active) WHERE is_active = true;

ALTER TABLE public.client_career_pages ENABLE ROW LEVEL SECURITY;

-- Membros da conta podem ver
CREATE POLICY "Account members can view career pages"
  ON public.client_career_pages FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Páginas ativas são públicas (necessário para acesso anônimo)
CREATE POLICY "Active career pages are public"
  ON public.client_career_pages FOR SELECT
  USING (is_active = true);

-- Membros podem criar
CREATE POLICY "Account members can create career pages"
  ON public.client_career_pages FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM public.account_members
      WHERE user_id = auth.uid() AND is_active = true
        AND role IN ('owner','admin','admin_rh','leader')
    )
  );

-- Membros podem atualizar
CREATE POLICY "Account members can update career pages"
  ON public.client_career_pages FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members
      WHERE user_id = auth.uid() AND is_active = true
        AND role IN ('owner','admin','admin_rh','leader')
    )
  );

-- Membros podem deletar
CREATE POLICY "Account members can delete career pages"
  ON public.client_career_pages FOR DELETE
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members
      WHERE user_id = auth.uid() AND is_active = true
        AND role IN ('owner','admin')
    )
  );

-- Trigger updated_at
CREATE TRIGGER trg_client_career_pages_updated_at
  BEFORE UPDATE ON public.client_career_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função: gerar slug único
CREATE OR REPLACE FUNCTION public.generate_client_career_slug(_client_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- Normaliza: lowercase, sem acentos, espaços viram hífens
  base_slug := lower(regexp_replace(
    translate(_client_name,
      'áàâãäåéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaaeeeeiiiiooooouuuucnAAAAAAEEEEIIIIOOOOOUUUUCN'
    ),
    '[^a-zA-Z0-9]+', '-', 'g'
  ));
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'cliente'; END IF;
  
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.client_career_pages WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Função: incrementa views (atômica, public)
CREATE OR REPLACE FUNCTION public.increment_career_page_views(_slug TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.client_career_pages
  SET total_views = total_views + 1
  WHERE slug = _slug AND is_active = true;
END;
$$;

-- Função: incrementa applications
CREATE OR REPLACE FUNCTION public.increment_career_page_applications(_page_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.client_career_pages
  SET total_applications = total_applications + 1
  WHERE id = _page_id;
END;
$$;

-- Bucket de assets (público para leitura)
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-career-assets', 'client-career-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policies do bucket
CREATE POLICY "Career assets are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-career-assets');

CREATE POLICY "Authenticated users can upload career assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-career-assets'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can update career assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'client-career-assets'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can delete career assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'client-career-assets'
    AND auth.uid() IS NOT NULL
  );
