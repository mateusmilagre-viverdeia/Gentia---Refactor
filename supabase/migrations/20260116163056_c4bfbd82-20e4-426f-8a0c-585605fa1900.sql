-- Tabela para links de compartilhamento público do Código de Cultura
CREATE TABLE public.culture_code_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.culture_code_files(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  
  CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);

-- Índices
CREATE INDEX idx_culture_code_shares_token ON public.culture_code_shares(token);
CREATE INDEX idx_culture_code_shares_account ON public.culture_code_shares(account_id);
CREATE INDEX idx_culture_code_shares_file ON public.culture_code_shares(file_id);

-- RLS
ALTER TABLE public.culture_code_shares ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados gerenciarem seus links
CREATE POLICY "Users can view their org shares"
ON public.culture_code_shares FOR SELECT
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can create shares for their org"
ON public.culture_code_shares FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can update their org shares"
ON public.culture_code_shares FOR UPDATE
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can delete their org shares"
ON public.culture_code_shares FOR DELETE
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Política para acesso público via token (leitura anônima)
CREATE POLICY "Public can view active non-expired shares by token"
ON public.culture_code_shares FOR SELECT
USING (
  is_active = true 
  AND expires_at > now()
);

-- Função para incrementar contagem de visualizações
CREATE OR REPLACE FUNCTION public.increment_share_view_count(share_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.culture_code_shares
  SET view_count = view_count + 1
  WHERE token = share_token
    AND is_active = true
    AND expires_at > now();
END;
$$;