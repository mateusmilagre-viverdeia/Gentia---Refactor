-- =============================================
-- FASE 4: Tabelas de Permissões
-- =============================================

-- 4.1 Tabela de módulos do sistema
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.2 Tabela de templates de permissões
CREATE TABLE public.permission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_role public.account_role,
  is_system_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.3 Tabela de permissões por template
CREATE TABLE public.template_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.permission_templates(id) ON DELETE CASCADE NOT NULL,
  module_slug TEXT NOT NULL REFERENCES public.modules(slug) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT TRUE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, module_slug)
);

-- 4.4 Tabela de permissões individuais por usuário
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_member_id UUID REFERENCES public.account_members(id) ON DELETE CASCADE NOT NULL,
  module_slug TEXT NOT NULL REFERENCES public.modules(slug) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT TRUE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_member_id, module_slug)
);

-- =============================================
-- RLS Policies
-- =============================================

-- Modules: leitura para todos autenticados
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read modules"
  ON public.modules FOR SELECT
  TO authenticated
  USING (true);

-- Permission Templates: leitura de defaults do sistema + templates da própria conta
ALTER TABLE public.permission_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read system defaults and own account templates"
  ON public.permission_templates FOR SELECT
  TO authenticated
  USING (
    is_system_default = true 
    OR account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage account templates"
  ON public.permission_templates FOR ALL
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Template Permissions: segue regras do template pai
ALTER TABLE public.template_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read template permissions"
  ON public.template_permissions FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM public.permission_templates 
      WHERE is_system_default = true 
      OR account_id IN (
        SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage template permissions"
  ON public.template_permissions FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT pt.id FROM public.permission_templates pt
      WHERE pt.account_id IN (
        SELECT account_id FROM public.account_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT pt.id FROM public.permission_templates pt
      WHERE pt.account_id IN (
        SELECT account_id FROM public.account_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- User Permissions: apenas owner/admin podem gerenciar
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own permissions"
  ON public.user_permissions FOR SELECT
  TO authenticated
  USING (
    account_member_id IN (
      SELECT id FROM public.account_members WHERE user_id = auth.uid()
    )
    OR account_member_id IN (
      SELECT am.id FROM public.account_members am
      WHERE am.account_id IN (
        SELECT account_id FROM public.account_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "Admins can manage user permissions"
  ON public.user_permissions FOR ALL
  TO authenticated
  USING (
    account_member_id IN (
      SELECT am.id FROM public.account_members am
      WHERE am.account_id IN (
        SELECT account_id FROM public.account_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (
    account_member_id IN (
      SELECT am.id FROM public.account_members am
      WHERE am.account_id IN (
        SELECT account_id FROM public.account_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- =============================================
-- FASE 5: Seed Data - Módulos do Sistema
-- =============================================

INSERT INTO public.modules (slug, name, category, description, sort_order) VALUES
-- Cultura
('cultura_criacao', 'Criação de Cultura', 'cultura', 'Definição de missão, visão e valores', 10),
('cultura_eventos', 'Eventos', 'cultura', 'Planejamento de eventos de cultura', 20),
('cultura_rituais', 'Rituais', 'cultura', 'Gestão de rituais organizacionais', 30),
('cultura_code', 'Culture Code', 'cultura', 'Documentação do código de cultura', 40),
-- Diagnóstico
('diagnostico_roi', 'Diagnóstico ROI', 'diagnostico', 'Análise de retorno sobre investimento', 50),
-- Atração
('atracao_vendendo', 'Vendendo a Empresa', 'atracao', 'Materiais para atração de talentos', 60),
('atracao_job_desc', 'Descrições de Cargo', 'atracao', 'Criação de job descriptions', 70),
('atracao_organograma', 'Organograma', 'atracao', 'Estrutura organizacional', 80),
-- Contratação
('contratacao_funil', 'Funil de Contratação', 'contratacao', 'Pipeline de recrutamento', 90),
('contratacao_perguntas', 'Perguntas Estratégicas', 'contratacao', 'Banco de perguntas para entrevistas', 100),
-- Retenção
('retencao_pulse', 'Pulse', 'retencao', 'Pesquisas de clima organizacional', 110),
('retencao_disc', 'DISC Assessment', 'retencao', 'Avaliações comportamentais DISC', 120),
('retencao_desempenho', 'Gestão de Desempenho', 'retencao', 'Avaliações de performance', 130),
('retencao_maturidade', 'Maturidade', 'retencao', 'Análise de maturidade do time', 140),
('retencao_onboarding', 'Onboarding', 'retencao', 'Processo de integração', 150),
('retencao_analisador', 'Analisador de Pessoas', 'retencao', 'Análise comportamental de pessoas', 160),
('retencao_habilidade', 'Matriz de Habilidades', 'retencao', 'Mapeamento de competências', 170),
-- Conta
('conta_empresa', 'Dados da Empresa', 'conta', 'Informações da organização', 180),
('conta_usuarios', 'Gestão de Usuários', 'conta', 'Membros e convites', 190),
('conta_permissoes', 'Permissões', 'conta', 'Controle de acesso', 200),
('conta_plano_acao', 'Plano de Ação', 'conta', 'Gestão de planos de ação', 210);

-- =============================================
-- FASE 5: Funções SECURITY DEFINER
-- =============================================

-- Função para obter permissões padrão por role
CREATE OR REPLACE FUNCTION public.get_default_permissions_for_role(p_role public.account_role)
RETURNS TABLE (
  module_slug TEXT,
  can_view BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.slug,
    -- Todos podem ver (exceto viewer em alguns módulos sensíveis)
    CASE 
      WHEN p_role = 'viewer' AND m.category IN ('conta') AND m.slug != 'conta_empresa' THEN FALSE
      ELSE TRUE
    END,
    -- Criar: owner, admin, admin_rh (em módulos específicos), leader (em sua equipe)
    CASE 
      WHEN p_role IN ('owner', 'admin') THEN TRUE
      WHEN p_role = 'admin_rh' AND m.category IN ('cultura', 'atracao', 'contratacao', 'retencao') THEN TRUE
      WHEN p_role = 'leader' AND m.category = 'retencao' AND m.slug IN ('retencao_pulse', 'retencao_disc') THEN TRUE
      ELSE FALSE
    END,
    -- Editar: similar a criar
    CASE 
      WHEN p_role IN ('owner', 'admin') THEN TRUE
      WHEN p_role = 'admin_rh' AND m.category IN ('cultura', 'atracao', 'contratacao', 'retencao') THEN TRUE
      WHEN p_role = 'leader' AND m.category = 'retencao' AND m.slug IN ('retencao_pulse', 'retencao_disc') THEN TRUE
      WHEN p_role = 'member' AND m.slug IN ('retencao_pulse', 'retencao_disc') THEN TRUE
      ELSE FALSE
    END,
    -- Deletar: apenas owner e admin
    CASE 
      WHEN p_role IN ('owner', 'admin') THEN TRUE
      WHEN p_role = 'admin_rh' AND m.category IN ('retencao') THEN TRUE
      ELSE FALSE
    END
  FROM public.modules m
  ORDER BY m.sort_order;
END;
$$;

-- Função principal para verificar permissão
CREATE OR REPLACE FUNCTION public.has_permission(
  p_user_id UUID,
  p_module_slug TEXT,
  p_action TEXT DEFAULT 'view'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_role public.account_role;
  v_permission RECORD;
  v_default_permission RECORD;
BEGIN
  -- Buscar membership do usuário
  SELECT am.id, am.role INTO v_member_id, v_role
  FROM public.account_members am
  WHERE am.user_id = p_user_id
  LIMIT 1;
  
  -- Se não encontrou membership, verificar se é owner direto da empresa
  IF v_member_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.companies WHERE user_id = p_user_id) THEN
      RETURN TRUE; -- Owner tem todas as permissões
    END IF;
    RETURN FALSE;
  END IF;
  
  -- Owner sempre tem todas as permissões
  IF v_role = 'owner' THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar permissões individuais (sobrescreve padrão)
  SELECT up.can_view, up.can_create, up.can_edit, up.can_delete INTO v_permission
  FROM public.user_permissions up
  WHERE up.account_member_id = v_member_id AND up.module_slug = p_module_slug;
  
  IF FOUND THEN
    CASE p_action
      WHEN 'view' THEN RETURN v_permission.can_view;
      WHEN 'create' THEN RETURN v_permission.can_create;
      WHEN 'edit' THEN RETURN v_permission.can_edit;
      WHEN 'delete' THEN RETURN v_permission.can_delete;
      ELSE RETURN FALSE;
    END CASE;
  END IF;
  
  -- Fallback para permissões padrão do role
  SELECT dp.can_view, dp.can_create, dp.can_edit, dp.can_delete INTO v_default_permission
  FROM public.get_default_permissions_for_role(v_role) dp
  WHERE dp.module_slug = p_module_slug;
  
  IF FOUND THEN
    CASE p_action
      WHEN 'view' THEN RETURN v_default_permission.can_view;
      WHEN 'create' THEN RETURN v_default_permission.can_create;
      WHEN 'edit' THEN RETURN v_default_permission.can_edit;
      WHEN 'delete' THEN RETURN v_default_permission.can_delete;
      ELSE RETURN FALSE;
    END CASE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Função para obter matriz completa de permissões do usuário
CREATE OR REPLACE FUNCTION public.get_user_permissions_matrix(p_user_id UUID)
RETURNS TABLE (
  module_slug TEXT,
  module_name TEXT,
  module_category TEXT,
  can_view BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  is_custom BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_role public.account_role;
BEGIN
  -- Buscar membership do usuário
  SELECT am.id, am.role INTO v_member_id, v_role
  FROM public.account_members am
  WHERE am.user_id = p_user_id
  LIMIT 1;
  
  -- Se não encontrou, verificar owner direto
  IF v_member_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.companies WHERE user_id = p_user_id) THEN
      v_role := 'owner';
    ELSE
      RETURN;
    END IF;
  END IF;
  
  RETURN QUERY
  SELECT 
    m.slug,
    m.name,
    m.category,
    COALESCE(up.can_view, dp.can_view),
    COALESCE(up.can_create, dp.can_create),
    COALESCE(up.can_edit, dp.can_edit),
    COALESCE(up.can_delete, dp.can_delete),
    up.id IS NOT NULL AS is_custom
  FROM public.modules m
  CROSS JOIN public.get_default_permissions_for_role(v_role) dp
  LEFT JOIN public.user_permissions up ON up.module_slug = m.slug AND up.account_member_id = v_member_id
  WHERE dp.module_slug = m.slug
  ORDER BY m.sort_order;
END;
$$;

-- Trigger para atualizar updated_at em user_permissions
CREATE OR REPLACE FUNCTION public.update_user_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_permissions_timestamp
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_permissions_updated_at();