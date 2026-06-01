-- Criar tabela de configurações da página de carreiras
CREATE TABLE public.careers_page_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Header
  headline text DEFAULT 'Oportunidades de Carreira',
  description text,
  logo_url text,
  cover_image_url text,
  
  -- Aparência
  primary_color text DEFAULT '#000000',
  show_company_name boolean DEFAULT true,
  show_department_filter boolean DEFAULT true,
  show_location_filter boolean DEFAULT true,
  
  -- Categorias personalizadas para filtros
  custom_categories text[] DEFAULT ARRAY['Vendas', 'Marketing', 'Engenharia', 'Design', 'RH'],
  
  -- SEO
  meta_title text,
  meta_description text,
  
  -- Controle
  is_published boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(account_id)
);

-- Habilitar RLS
ALTER TABLE public.careers_page_settings ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode visualizar páginas publicadas (acesso público)
CREATE POLICY "Public can view published careers pages"
  ON public.careers_page_settings FOR SELECT
  USING (is_published = true);

-- Membros da organização podem gerenciar suas configurações
CREATE POLICY "Account members can manage careers settings"
  ON public.careers_page_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM account_members
      WHERE account_members.account_id = careers_page_settings.account_id
      AND account_members.user_id = auth.uid()
      AND account_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_members
      WHERE account_members.account_id = careers_page_settings.account_id
      AND account_members.user_id = auth.uid()
      AND account_members.is_active = true
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_careers_page_settings_updated_at
  BEFORE UPDATE ON public.careers_page_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();