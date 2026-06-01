-- Fase 4 (parte 1): Preferências de contato do candidato (opt-out global + exceções por vaga)

-- 1) Tabela: preferências globais por candidato
CREATE TABLE IF NOT EXISTS public.recruitment_candidate_contact_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  opt_out_all boolean NOT NULL DEFAULT false,
  note text NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  CONSTRAINT recruitment_candidate_contact_prefs_account_candidate_unique UNIQUE (account_id, candidate_id)
);

ALTER TABLE public.recruitment_candidate_contact_prefs ENABLE ROW LEVEL SECURITY;

-- 2) Tabela: exceções por vaga (permitir contato mesmo com opt-out global)
CREATE TABLE IF NOT EXISTS public.recruitment_candidate_contact_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  job_id uuid NOT NULL,
  allow_contact boolean NOT NULL DEFAULT true,
  note text NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  CONSTRAINT recruitment_candidate_contact_exceptions_account_candidate_job_unique UNIQUE (account_id, candidate_id, job_id)
);

ALTER TABLE public.recruitment_candidate_contact_exceptions ENABLE ROW LEVEL SECURITY;

-- Índices para consultas comuns
CREATE INDEX IF NOT EXISTS idx_rccp_account_candidate ON public.recruitment_candidate_contact_prefs (account_id, candidate_id);
CREATE INDEX IF NOT EXISTS idx_rcce_account_candidate_job ON public.recruitment_candidate_contact_exceptions (account_id, candidate_id, job_id);
CREATE INDEX IF NOT EXISTS idx_rcce_job ON public.recruitment_candidate_contact_exceptions (job_id);

-- Função/trigger padrão para updated_at (cria/atualiza se já existir)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_recruitment_candidate_contact_prefs_updated_at ON public.recruitment_candidate_contact_prefs;
CREATE TRIGGER trg_recruitment_candidate_contact_prefs_updated_at
BEFORE UPDATE ON public.recruitment_candidate_contact_prefs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_recruitment_candidate_contact_exceptions_updated_at ON public.recruitment_candidate_contact_exceptions;
CREATE TRIGGER trg_recruitment_candidate_contact_exceptions_updated_at
BEFORE UPDATE ON public.recruitment_candidate_contact_exceptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies (multi-tenant): permitir acesso por conta (membro/consultor com permissão)
-- Observação: estas funções já são usadas como padrão no projeto.

-- prefs
DROP POLICY IF EXISTS "rccp_select" ON public.recruitment_candidate_contact_prefs;
CREATE POLICY "rccp_select"
ON public.recruitment_candidate_contact_prefs
FOR SELECT
USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "rccp_insert" ON public.recruitment_candidate_contact_prefs;
CREATE POLICY "rccp_insert"
ON public.recruitment_candidate_contact_prefs
FOR INSERT
WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "rccp_update" ON public.recruitment_candidate_contact_prefs;
CREATE POLICY "rccp_update"
ON public.recruitment_candidate_contact_prefs
FOR UPDATE
USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
)
WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "rccp_delete" ON public.recruitment_candidate_contact_prefs;
CREATE POLICY "rccp_delete"
ON public.recruitment_candidate_contact_prefs
FOR DELETE
USING (
  can_edit_client_project(auth.uid(), account_id)
);

-- exceptions
DROP POLICY IF EXISTS "rcce_select" ON public.recruitment_candidate_contact_exceptions;
CREATE POLICY "rcce_select"
ON public.recruitment_candidate_contact_exceptions
FOR SELECT
USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "rcce_insert" ON public.recruitment_candidate_contact_exceptions;
CREATE POLICY "rcce_insert"
ON public.recruitment_candidate_contact_exceptions
FOR INSERT
WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "rcce_update" ON public.recruitment_candidate_contact_exceptions;
CREATE POLICY "rcce_update"
ON public.recruitment_candidate_contact_exceptions
FOR UPDATE
USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
)
WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "rcce_delete" ON public.recruitment_candidate_contact_exceptions;
CREATE POLICY "rcce_delete"
ON public.recruitment_candidate_contact_exceptions
FOR DELETE
USING (
  can_edit_client_project(auth.uid(), account_id)
);
