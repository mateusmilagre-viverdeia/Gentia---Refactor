-- 1. Criar tabela account_licensed_modules
CREATE TABLE IF NOT EXISTS public.account_licensed_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_slug TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'full' CHECK (access_level IN ('full', 'view_only', 'disabled')),
  configured_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, module_slug)
);

-- 2. Habilitar RLS
ALTER TABLE public.account_licensed_modules ENABLE ROW LEVEL SECURITY;

-- 3. Política de leitura: usuários podem ver licenças do próprio account
CREATE POLICY "Users can view own account licenses"
  ON public.account_licensed_modules FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid()
    )
  );

-- 4. Política de gestão: apenas EP Team pode gerenciar
CREATE POLICY "EP Team can manage client licenses"
  ON public.account_licensed_modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ep_consultants 
      WHERE user_id = auth.uid() 
      AND active = true
    )
  );

-- 5. Função helper para obter nível de acesso
CREATE OR REPLACE FUNCTION public.get_module_access_level(p_account_id UUID, p_module_slug TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT access_level FROM public.account_licensed_modules 
     WHERE account_id = p_account_id AND module_slug = p_module_slug),
    'full'
  );
$$;

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_account_licensed_modules_account 
  ON public.account_licensed_modules(account_id);
CREATE INDEX IF NOT EXISTS idx_account_licensed_modules_lookup 
  ON public.account_licensed_modules(account_id, module_slug);

-- 7. Trigger para updated_at
CREATE TRIGGER update_account_licensed_modules_updated_at
  BEFORE UPDATE ON public.account_licensed_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();