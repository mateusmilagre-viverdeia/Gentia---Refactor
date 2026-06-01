-- Tabela para armazenar referencia do PDF do Codigo de Cultura
CREATE TABLE public.culture_code_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices
CREATE INDEX idx_culture_code_files_account ON public.culture_code_files(account_id);
CREATE INDEX idx_culture_code_files_active ON public.culture_code_files(account_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.culture_code_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org files"
ON public.culture_code_files FOR SELECT
USING (account_id IN (
  SELECT account_id FROM public.account_members 
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Users can insert files for their org"
ON public.culture_code_files FOR INSERT
WITH CHECK (account_id IN (
  SELECT account_id FROM public.account_members 
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Users can update their org files"
ON public.culture_code_files FOR UPDATE
USING (account_id IN (
  SELECT account_id FROM public.account_members 
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Users can delete their org files"
ON public.culture_code_files FOR DELETE
USING (account_id IN (
  SELECT account_id FROM public.account_members 
  WHERE user_id = auth.uid() AND is_active = true
));

-- Bucket para arquivos de cultura
INSERT INTO storage.buckets (id, name, public)
VALUES ('culture-files', 'culture-files', true)
ON CONFLICT (id) DO NOTHING;

-- Politicas de acesso ao Storage
CREATE POLICY "Users can upload culture files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'culture-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.companies 
    WHERE id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Anyone can view culture files"
ON storage.objects FOR SELECT
USING (bucket_id = 'culture-files');

CREATE POLICY "Users can delete their culture files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'culture-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.companies 
    WHERE id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);