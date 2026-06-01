-- Tabela de histórico de alterações de licenciamento (Auditoria)
CREATE TABLE public.license_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_slug TEXT NOT NULL,
  previous_access_level TEXT,
  new_access_level TEXT NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now(),
  change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete', 'reset', 'template_applied')),
  notes TEXT
);

-- Índices para performance
CREATE INDEX idx_license_history_account ON public.license_change_history(account_id);
CREATE INDEX idx_license_history_changed_at ON public.license_change_history(changed_at DESC);
CREATE INDEX idx_license_history_changed_by ON public.license_change_history(changed_by);

-- RLS
ALTER TABLE public.license_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "EP Team can view license history"
  ON public.license_change_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ep_consultants 
    WHERE user_id = auth.uid() AND active = true
  ));

CREATE POLICY "EP Team can create license history"
  ON public.license_change_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ep_consultants 
    WHERE user_id = auth.uid() AND active = true
  ));

-- Tabela de templates de licenciamento
CREATE TABLE public.license_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_default BOOLEAN DEFAULT false
);

-- Tabela de módulos dos templates
CREATE TABLE public.license_template_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.license_templates(id) ON DELETE CASCADE,
  module_slug TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'full' CHECK (access_level IN ('full', 'view_only', 'disabled')),
  UNIQUE(template_id, module_slug)
);

-- RLS para templates
ALTER TABLE public.license_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_template_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "EP Team can manage templates"
  ON public.license_templates FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.ep_consultants 
    WHERE user_id = auth.uid() AND active = true
  ));

CREATE POLICY "EP Team can manage template modules"
  ON public.license_template_modules FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.ep_consultants 
    WHERE user_id = auth.uid() AND active = true
  ));

-- Trigger para updated_at
CREATE TRIGGER update_license_templates_updated_at
  BEFORE UPDATE ON public.license_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Templates pré-configurados
INSERT INTO public.license_templates (name, description, is_default) VALUES
  ('Básico', 'Acesso básico com foco em Cultura e Diagnóstico', false),
  ('Completo', 'Acesso completo a todos os módulos', true),
  ('Diagnóstico', 'Apenas módulo de Diagnóstico liberado', false);

-- Módulos do template Básico
INSERT INTO public.license_template_modules (template_id, module_slug, access_level)
SELECT t.id, m.slug, 
  CASE 
    WHEN m.slug IN ('missao', 'visao', 'valores', 'decisao', 'energia', 'desenvolvimento', 'culture-code') THEN 'full'
    WHEN m.slug IN ('disc', 'disc-teams', 'disc-invite') THEN 'full'
    WHEN m.slug IN ('vagas', 'candidatos', 'entrevista-cultural', 'pagina-carreiras') THEN 'view_only'
    WHEN m.slug IN ('funcionarios', 'aniversarios', 'organograma', 'onboarding') THEN 'view_only'
    ELSE 'disabled'
  END
FROM public.license_templates t
CROSS JOIN public.modules m
WHERE t.name = 'Básico';

-- Módulos do template Completo
INSERT INTO public.license_template_modules (template_id, module_slug, access_level)
SELECT t.id, m.slug, 'full'
FROM public.license_templates t
CROSS JOIN public.modules m
WHERE t.name = 'Completo';

-- Módulos do template Diagnóstico
INSERT INTO public.license_template_modules (template_id, module_slug, access_level)
SELECT t.id, m.slug, 
  CASE 
    WHEN m.slug IN ('disc', 'disc-teams', 'disc-invite') THEN 'full'
    WHEN m.slug IN ('missao', 'visao', 'valores') THEN 'view_only'
    ELSE 'disabled'
  END
FROM public.license_templates t
CROSS JOIN public.modules m
WHERE t.name = 'Diagnóstico';