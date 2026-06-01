-- =====================================================
-- MÓDULO DE OFFBOARDING (DESLIGAMENTO)
-- =====================================================

-- 1. Tabela principal: Casos de Offboarding
CREATE TABLE public.offboarding_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Dados do colaborador
  employee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT,
  department TEXT,
  position TEXT,
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  manager_name TEXT,
  
  -- Dados do desligamento
  termination_type TEXT NOT NULL CHECK (termination_type IN ('voluntary', 'involuntary', 'contract_end')),
  notice_date DATE NOT NULL,
  last_day DATE NOT NULL,
  
  -- Status do processo
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  
  -- Status da pesquisa
  survey_status TEXT DEFAULT 'pending' CHECK (survey_status IN ('pending', 'sent', 'responded')),
  survey_sent_at TIMESTAMPTZ,
  survey_responded_at TIMESTAMPTZ,
  
  -- Metadados
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de Templates de Offboarding
CREATE TABLE public.offboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabela de Tarefas do Template
CREATE TABLE public.offboarding_template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.offboarding_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  responsible_type TEXT NOT NULL CHECK (responsible_type IN ('rh', 'leader', 'employee', 'ti', 'head_cs')),
  responsible_profile TEXT, -- 'Admin', 'Admin RH', 'Head de CS', 'Membro'
  due_offset_days INTEGER DEFAULT 0, -- dias antes do último dia (negativo = antes, 0 = último dia)
  is_required BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  task_type TEXT CHECK (task_type IN ('survey', 'access_revocation', 'equipment', 'documentation', 'communication', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabela de Tarefas do Offboarding (instâncias)
CREATE TABLE public.offboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.offboarding_cases(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  
  -- Responsável
  responsible_type TEXT NOT NULL CHECK (responsible_type IN ('rh', 'leader', 'employee', 'ti', 'head_cs')),
  responsible_profile TEXT, -- 'Admin', 'Admin RH', 'Head de CS', 'Membro'
  responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responsible_user_name TEXT,
  
  -- Datas e status
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'waived')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Controle
  is_required BOOLEAN DEFAULT true,
  waive_reason TEXT,
  order_index INTEGER DEFAULT 0,
  
  -- Tipo especial
  task_type TEXT CHECK (task_type IN ('survey', 'access_revocation', 'equipment', 'documentation', 'communication', 'other')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabela de Tokens para Pesquisa Pública
CREATE TABLE public.offboarding_survey_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.offboarding_cases(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tabela de Respostas da Pesquisa de Saída
CREATE TABLE public.offboarding_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.offboarding_cases(id) ON DELETE CASCADE,
  
  -- Questão 1: Motivo principal
  primary_reason TEXT,
  
  -- Questão 2: Motivos secundários (até 2)
  secondary_reasons TEXT[],
  
  -- Questão 3: Evitabilidade (0-10)
  avoidability_score INTEGER CHECK (avoidability_score >= 0 AND avoidability_score <= 10),
  
  -- Questão 4: eNPS (0-10)
  enps_score INTEGER CHECK (enps_score >= 0 AND enps_score <= 10),
  
  -- Questão 5-8: Notas (1-5)
  leadership_rating INTEGER CHECK (leadership_rating >= 1 AND leadership_rating <= 5),
  growth_rating INTEGER CHECK (growth_rating >= 1 AND growth_rating <= 5),
  workload_rating INTEGER CHECK (workload_rating >= 1 AND workload_rating <= 5),
  compensation_rating INTEGER CHECK (compensation_rating >= 1 AND compensation_rating <= 5),
  
  -- Questão 9: Campo aberto
  additional_comments TEXT,
  
  -- Metadados
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_offboarding_cases_account ON public.offboarding_cases(account_id);
CREATE INDEX idx_offboarding_cases_status ON public.offboarding_cases(status);
CREATE INDEX idx_offboarding_cases_employee ON public.offboarding_cases(employee_user_id);
CREATE INDEX idx_offboarding_tasks_case ON public.offboarding_tasks(case_id);
CREATE INDEX idx_offboarding_tasks_responsible ON public.offboarding_tasks(responsible_user_id);
CREATE INDEX idx_offboarding_tasks_status ON public.offboarding_tasks(status);
CREATE INDEX idx_offboarding_survey_tokens_token ON public.offboarding_survey_tokens(token);
CREATE INDEX idx_offboarding_survey_tokens_case ON public.offboarding_survey_tokens(case_id);

-- =====================================================
-- HABILITAR RLS
-- =====================================================

ALTER TABLE public.offboarding_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offboarding_template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offboarding_survey_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offboarding_survey_responses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNÇÃO HELPER: Verificar acesso à organização
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_has_account_access(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_members am
    WHERE am.account_id = p_account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
$$;

-- =====================================================
-- FUNÇÃO HELPER: Verificar role do usuário
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_has_role_in_account(p_account_id UUID, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_members am
    WHERE am.account_id = p_account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
      AND am.role::TEXT = ANY(p_roles)
  )
$$;

-- =====================================================
-- POLÍTICAS RLS: offboarding_cases
-- =====================================================

-- SELECT: Membros da organização podem ver casos
CREATE POLICY "Users can view offboarding cases in their org"
ON public.offboarding_cases
FOR SELECT
TO authenticated
USING (public.user_has_account_access(account_id));

-- INSERT: Apenas admin e owner podem criar casos
CREATE POLICY "Admins can create offboarding cases"
ON public.offboarding_cases
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_role_in_account(account_id, ARRAY['owner', 'admin']));

-- UPDATE: Apenas admin e owner podem atualizar casos
CREATE POLICY "Admins can update offboarding cases"
ON public.offboarding_cases
FOR UPDATE
TO authenticated
USING (public.user_has_role_in_account(account_id, ARRAY['owner', 'admin']));

-- DELETE: Apenas owner pode deletar casos
CREATE POLICY "Owners can delete offboarding cases"
ON public.offboarding_cases
FOR DELETE
TO authenticated
USING (public.user_has_role_in_account(account_id, ARRAY['owner']));

-- =====================================================
-- POLÍTICAS RLS: offboarding_templates
-- =====================================================

-- SELECT: Membros da organização podem ver templates
CREATE POLICY "Users can view offboarding templates in their org"
ON public.offboarding_templates
FOR SELECT
TO authenticated
USING (account_id IS NULL OR public.user_has_account_access(account_id));

-- INSERT: Apenas admin e owner podem criar templates
CREATE POLICY "Admins can create offboarding templates"
ON public.offboarding_templates
FOR INSERT
TO authenticated
WITH CHECK (account_id IS NULL OR public.user_has_role_in_account(account_id, ARRAY['owner', 'admin']));

-- UPDATE: Apenas admin e owner podem atualizar templates
CREATE POLICY "Admins can update offboarding templates"
ON public.offboarding_templates
FOR UPDATE
TO authenticated
USING (account_id IS NULL OR public.user_has_role_in_account(account_id, ARRAY['owner', 'admin']));

-- DELETE: Apenas owner pode deletar templates
CREATE POLICY "Owners can delete offboarding templates"
ON public.offboarding_templates
FOR DELETE
TO authenticated
USING (account_id IS NULL OR public.user_has_role_in_account(account_id, ARRAY['owner']));

-- =====================================================
-- POLÍTICAS RLS: offboarding_template_tasks
-- =====================================================

-- SELECT: Qualquer usuário autenticado pode ver tarefas de template
CREATE POLICY "Users can view offboarding template tasks"
ON public.offboarding_template_tasks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.offboarding_templates t
    WHERE t.id = template_id
    AND (t.account_id IS NULL OR public.user_has_account_access(t.account_id))
  )
);

-- INSERT: Admins podem criar tarefas de template
CREATE POLICY "Admins can create offboarding template tasks"
ON public.offboarding_template_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.offboarding_templates t
    WHERE t.id = template_id
    AND (t.account_id IS NULL OR public.user_has_role_in_account(t.account_id, ARRAY['owner', 'admin']))
  )
);

-- UPDATE: Admins podem atualizar tarefas de template
CREATE POLICY "Admins can update offboarding template tasks"
ON public.offboarding_template_tasks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.offboarding_templates t
    WHERE t.id = template_id
    AND (t.account_id IS NULL OR public.user_has_role_in_account(t.account_id, ARRAY['owner', 'admin']))
  )
);

-- DELETE: Owners podem deletar tarefas de template
CREATE POLICY "Owners can delete offboarding template tasks"
ON public.offboarding_template_tasks
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.offboarding_templates t
    WHERE t.id = template_id
    AND (t.account_id IS NULL OR public.user_has_role_in_account(t.account_id, ARRAY['owner']))
  )
);

-- =====================================================
-- POLÍTICAS RLS: offboarding_tasks
-- =====================================================

-- SELECT: Membros podem ver tarefas do seu org OU tarefas atribuídas a eles
CREATE POLICY "Users can view offboarding tasks"
ON public.offboarding_tasks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.offboarding_cases c
    WHERE c.id = case_id
    AND public.user_has_account_access(c.account_id)
  )
  OR responsible_user_id = auth.uid()
);

-- INSERT: Admins podem criar tarefas
CREATE POLICY "Admins can create offboarding tasks"
ON public.offboarding_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.offboarding_cases c
    WHERE c.id = case_id
    AND public.user_has_role_in_account(c.account_id, ARRAY['owner', 'admin'])
  )
);

-- UPDATE: Admins podem atualizar qualquer tarefa; responsáveis podem atualizar suas tarefas
CREATE POLICY "Users can update their offboarding tasks"
ON public.offboarding_tasks
FOR UPDATE
TO authenticated
USING (
  responsible_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.offboarding_cases c
    WHERE c.id = case_id
    AND public.user_has_role_in_account(c.account_id, ARRAY['owner', 'admin'])
  )
);

-- DELETE: Apenas admins podem deletar tarefas
CREATE POLICY "Admins can delete offboarding tasks"
ON public.offboarding_tasks
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.offboarding_cases c
    WHERE c.id = case_id
    AND public.user_has_role_in_account(c.account_id, ARRAY['owner', 'admin'])
  )
);

-- =====================================================
-- POLÍTICAS RLS: offboarding_survey_tokens
-- =====================================================

-- SELECT: Admins podem ver tokens; acesso público por token específico é feito via função
CREATE POLICY "Admins can view offboarding survey tokens"
ON public.offboarding_survey_tokens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.offboarding_cases c
    WHERE c.id = case_id
    AND public.user_has_role_in_account(c.account_id, ARRAY['owner', 'admin'])
  )
);

-- Política para acesso anônimo por token (para pesquisa pública)
CREATE POLICY "Public can access survey by valid token"
ON public.offboarding_survey_tokens
FOR SELECT
TO anon
USING (
  used_at IS NULL 
  AND expires_at > NOW()
);

-- INSERT: Apenas sistema/admins criam tokens
CREATE POLICY "Admins can create offboarding survey tokens"
ON public.offboarding_survey_tokens
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.offboarding_cases c
    WHERE c.id = case_id
    AND public.user_has_role_in_account(c.account_id, ARRAY['owner', 'admin'])
  )
);

-- UPDATE: Sistema pode marcar como usado
CREATE POLICY "Token can be marked as used"
ON public.offboarding_survey_tokens
FOR UPDATE
TO anon, authenticated
USING (true);

-- =====================================================
-- POLÍTICAS RLS: offboarding_survey_responses
-- =====================================================

-- SELECT: Apenas Admin e Admin RH podem ver respostas (proteger campo aberto)
CREATE POLICY "Admins can view offboarding survey responses"
ON public.offboarding_survey_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.offboarding_cases c
    WHERE c.id = case_id
    AND public.user_has_role_in_account(c.account_id, ARRAY['owner', 'admin'])
  )
);

-- INSERT: Permitir inserção anônima (via token) ou autenticada
CREATE POLICY "Anyone can submit survey response"
ON public.offboarding_survey_responses
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- =====================================================
-- FUNÇÃO: Atualizar updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_offboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_offboarding_cases_updated_at
  BEFORE UPDATE ON public.offboarding_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_offboarding_updated_at();

CREATE TRIGGER update_offboarding_templates_updated_at
  BEFORE UPDATE ON public.offboarding_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_offboarding_updated_at();

CREATE TRIGGER update_offboarding_tasks_updated_at
  BEFORE UPDATE ON public.offboarding_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_offboarding_updated_at();

-- =====================================================
-- INSERIR TEMPLATE PADRÃO DE OFFBOARDING
-- =====================================================

INSERT INTO public.offboarding_templates (id, account_id, name, description, is_active, is_default)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  NULL, -- Template global
  'Checklist Padrão de Desligamento',
  'Template padrão com as principais tarefas do processo de offboarding',
  true,
  true
);

-- Inserir tarefas do template padrão
INSERT INTO public.offboarding_template_tasks (template_id, title, description, responsible_type, responsible_profile, due_offset_days, is_required, order_index, task_type)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Responder pesquisa de desligamento', 'O colaborador deve responder a pesquisa de saída para compartilhar feedback', 'employee', 'Membro', 0, true, 1, 'survey'),
  ('a0000000-0000-0000-0000-000000000001', 'Revogar acessos e senhas', 'Desativar todos os acessos do colaborador aos sistemas da empresa', 'ti', 'Admin', 0, true, 2, 'access_revocation'),
  ('a0000000-0000-0000-0000-000000000001', 'Devolução de equipamentos', 'Receber e conferir equipamentos devolvidos pelo colaborador', 'rh', 'Admin RH', 0, false, 3, 'equipment'),
  ('a0000000-0000-0000-0000-000000000001', 'Documentação do desligamento', 'Preparar e coletar assinaturas em documentos de rescisão', 'rh', 'Admin RH', 0, true, 4, 'documentation'),
  ('a0000000-0000-0000-0000-000000000001', 'Comunicação interna', 'Comunicar a equipe sobre a saída do colaborador', 'leader', 'Head de CS', -1, true, 5, 'communication');