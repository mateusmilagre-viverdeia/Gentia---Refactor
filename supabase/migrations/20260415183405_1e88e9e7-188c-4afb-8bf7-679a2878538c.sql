
-- =============================================
-- Fase 1: GENTIA para Consultorias — Database
-- =============================================

-- 1. clientes_consultoria
CREATE TABLE public.clientes_consultoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text,
  setor text,
  porte text, -- startup | pequena | media | grande | enterprise
  site text,
  logo_url text,
  status text NOT NULL DEFAULT 'ativo', -- ativo | inativo | prospect
  fee_percentual numeric,
  fee_fixo numeric,
  modelo_fee text, -- percentual | fixo | hibrido
  prazo_garantia_dias integer DEFAULT 90,
  prazo_entrega_dias integer DEFAULT 15,
  responsavel_interno uuid,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clientes_consultoria_account ON public.clientes_consultoria(account_id);
CREATE INDEX idx_clientes_consultoria_status ON public.clientes_consultoria(account_id, status);

ALTER TABLE public.clientes_consultoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own org clients"
  ON public.clientes_consultoria FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = clientes_consultoria.account_id AND am.user_id = auth.uid() AND am.is_active = true)
    OR can_edit_client_project(auth.uid(), clientes_consultoria.account_id)
  );

CREATE POLICY "Members can insert own org clients"
  ON public.clientes_consultoria FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = clientes_consultoria.account_id AND am.user_id = auth.uid() AND am.is_active = true)
    OR can_edit_client_project(auth.uid(), clientes_consultoria.account_id)
  );

CREATE POLICY "Members can update own org clients"
  ON public.clientes_consultoria FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = clientes_consultoria.account_id AND am.user_id = auth.uid() AND am.is_active = true)
    OR can_edit_client_project(auth.uid(), clientes_consultoria.account_id)
  );

CREATE POLICY "Members can delete own org clients"
  ON public.clientes_consultoria FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = clientes_consultoria.account_id AND am.user_id = auth.uid() AND am.is_active = true)
    OR can_edit_client_project(auth.uid(), clientes_consultoria.account_id)
  );

CREATE TRIGGER set_clientes_consultoria_updated_at
  BEFORE UPDATE ON public.clientes_consultoria
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. clientes_contatos
CREATE TABLE public.clientes_contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cargo text,
  email text,
  whatsapp text,
  eh_decisor boolean DEFAULT false,
  eh_contato_principal boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clientes_contatos_cliente ON public.clientes_contatos(cliente_id);

ALTER TABLE public.clientes_contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own org contacts"
  ON public.clientes_contatos FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = clientes_contatos.account_id AND am.user_id = auth.uid() AND am.is_active = true)
    OR can_edit_client_project(auth.uid(), clientes_contatos.account_id)
  );

CREATE POLICY "Members can insert own org contacts"
  ON public.clientes_contatos FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = clientes_contatos.account_id AND am.user_id = auth.uid() AND am.is_active = true)
    OR can_edit_client_project(auth.uid(), clientes_contatos.account_id)
  );

CREATE POLICY "Members can update own org contacts"
  ON public.clientes_contatos FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = clientes_contatos.account_id AND am.user_id = auth.uid() AND am.is_active = true)
    OR can_edit_client_project(auth.uid(), clientes_contatos.account_id)
  );

CREATE POLICY "Members can delete own org contacts"
  ON public.clientes_contatos FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = clientes_contatos.account_id AND am.user_id = auth.uid() AND am.is_active = true)
    OR can_edit_client_project(auth.uid(), clientes_contatos.account_id)
  );

-- 3. portal_clientes_acesso
CREATE TABLE public.portal_clientes_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  contato_id uuid REFERENCES public.clientes_contatos(id),
  email text NOT NULL,
  token_acesso text UNIQUE DEFAULT gen_random_uuid()::text,
  ultimo_acesso timestamptz,
  ativo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_portal_acesso_email ON public.portal_clientes_acesso(email);
CREATE INDEX idx_portal_acesso_token ON public.portal_clientes_acesso(token_acesso);
CREATE INDEX idx_portal_acesso_cliente ON public.portal_clientes_acesso(cliente_id);

ALTER TABLE public.portal_clientes_acesso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage portal access"
  ON public.portal_clientes_acesso FOR ALL
  USING (
    EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = portal_clientes_acesso.account_id AND am.user_id = auth.uid() AND am.is_active = true)
    OR can_edit_client_project(auth.uid(), portal_clientes_acesso.account_id)
  );

-- Public read by token for portal
CREATE POLICY "Portal access by token"
  ON public.portal_clientes_acesso FOR SELECT
  TO anon
  USING (true);

-- 4. portal_feedbacks
CREATE TABLE public.portal_feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vaga_id uuid REFERENCES public.recruitment_jobs(id),
  candidato_id uuid,
  cliente_id uuid REFERENCES public.clientes_consultoria(id),
  contato_id uuid REFERENCES public.clientes_contatos(id),
  decisao text, -- aprovado | reprovado | mais_informacoes
  motivo text,
  nota integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_feedbacks_vaga ON public.portal_feedbacks(vaga_id);
CREATE INDEX idx_portal_feedbacks_cliente ON public.portal_feedbacks(cliente_id);

ALTER TABLE public.portal_feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage feedbacks"
  ON public.portal_feedbacks FOR ALL
  USING (
    EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = portal_feedbacks.account_id AND am.user_id = auth.uid() AND am.is_active = true)
    OR can_edit_client_project(auth.uid(), portal_feedbacks.account_id)
  );

-- Anon insert for portal feedback submission
CREATE POLICY "Portal can submit feedbacks"
  ON public.portal_feedbacks FOR INSERT
  TO anon
  WITH CHECK (true);

-- 5. shortlist_relatorios
CREATE TABLE public.shortlist_relatorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vaga_id uuid REFERENCES public.recruitment_jobs(id),
  cliente_id uuid REFERENCES public.clientes_consultoria(id),
  titulo text,
  conteudo_json jsonb,
  pdf_url text,
  token_publico text UNIQUE DEFAULT gen_random_uuid()::text,
  visualizacoes integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shortlist_relatorios_vaga ON public.shortlist_relatorios(vaga_id);
CREATE INDEX idx_shortlist_relatorios_token ON public.shortlist_relatorios(token_publico);

ALTER TABLE public.shortlist_relatorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage reports"
  ON public.shortlist_relatorios FOR ALL
  USING (
    EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = shortlist_relatorios.account_id AND am.user_id = auth.uid() AND am.is_active = true)
    OR can_edit_client_project(auth.uid(), shortlist_relatorios.account_id)
  );

-- Public read by token for report viewer
CREATE POLICY "Public can view reports by token"
  ON public.shortlist_relatorios FOR SELECT
  TO anon
  USING (true);

CREATE TRIGGER set_shortlist_relatorios_updated_at
  BEFORE UPDATE ON public.shortlist_relatorios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. fees_historico
CREATE TABLE public.fees_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vaga_id uuid REFERENCES public.recruitment_jobs(id),
  cliente_id uuid REFERENCES public.clientes_consultoria(id),
  valor_fee numeric NOT NULL,
  status text DEFAULT 'a_receber', -- a_receber | recebido | cancelado
  data_previsao timestamptz,
  data_recebimento timestamptz,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fees_historico_cliente ON public.fees_historico(cliente_id);
CREATE INDEX idx_fees_historico_status ON public.fees_historico(account_id, status);

ALTER TABLE public.fees_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage fees"
  ON public.fees_historico FOR ALL
  USING (
    EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = fees_historico.account_id AND am.user_id = auth.uid() AND am.is_active = true)
    OR can_edit_client_project(auth.uid(), fees_historico.account_id)
  );

-- 7. Alter recruitment_jobs — add client columns
ALTER TABLE public.recruitment_jobs
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes_consultoria(id),
  ADD COLUMN IF NOT EXISTS fee_acordado numeric,
  ADD COLUMN IF NOT EXISTS prazo_entrega_dias integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS data_abertura_cliente timestamptz,
  ADD COLUMN IF NOT EXISTS data_limite_entrega timestamptz,
  ADD COLUMN IF NOT EXISTS salario_contratado numeric,
  ADD COLUMN IF NOT EXISTS data_contratacao timestamptz,
  ADD COLUMN IF NOT EXISTS em_garantia boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS garantia_expira_em timestamptz,
  ADD COLUMN IF NOT EXISTS reposicao_da_vaga_id uuid REFERENCES public.recruitment_jobs(id);

CREATE INDEX IF NOT EXISTS idx_recruitment_jobs_cliente ON public.recruitment_jobs(cliente_id);
