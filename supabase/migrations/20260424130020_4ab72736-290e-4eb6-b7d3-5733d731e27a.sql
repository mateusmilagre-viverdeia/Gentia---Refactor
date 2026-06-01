-- 1) Adicionar coluna is_demo nas 6 tabelas-alvo
ALTER TABLE public.clientes_consultoria ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.recruitment_jobs ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.recruitment_candidates ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.recruitment_applications ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.candidate_nps ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.candidate_process_history ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- 2) Índices parciais para acelerar limpeza WHERE is_demo = true
CREATE INDEX IF NOT EXISTS idx_clientes_consultoria_is_demo ON public.clientes_consultoria(account_id) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_recruitment_jobs_is_demo ON public.recruitment_jobs(account_id) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_recruitment_candidates_is_demo ON public.recruitment_candidates(account_id) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_recruitment_applications_is_demo ON public.recruitment_applications(account_id) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_candidate_nps_is_demo ON public.candidate_nps(account_id) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_candidate_process_history_is_demo ON public.candidate_process_history(account_id) WHERE is_demo = true;

-- 3) Tabela account_demo_config
CREATE TABLE IF NOT EXISTS public.account_demo_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  demo_mode_active boolean NOT NULL DEFAULT false,
  activated_at timestamptz,
  activated_by uuid,
  deactivated_at timestamptz,
  deactivated_by uuid,
  demo_records_count integer NOT NULL DEFAULT 0,
  last_seed_at timestamptz,
  last_clear_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_demo_config_account_id ON public.account_demo_config(account_id);
CREATE INDEX IF NOT EXISTS idx_account_demo_config_active ON public.account_demo_config(account_id) WHERE demo_mode_active = true;

ALTER TABLE public.account_demo_config ENABLE ROW LEVEL SECURITY;

-- RLS: apenas membros ativos da conta podem ler; apenas Owners/Admins podem modificar
DROP POLICY IF EXISTS "Members can view their account demo config" ON public.account_demo_config;
CREATE POLICY "Members can view their account demo config"
ON public.account_demo_config FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = account_demo_config.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
);

DROP POLICY IF EXISTS "Owners and admins can insert demo config" ON public.account_demo_config;
CREATE POLICY "Owners and admins can insert demo config"
ON public.account_demo_config FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = account_demo_config.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
      AND am.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Owners and admins can update demo config" ON public.account_demo_config;
CREATE POLICY "Owners and admins can update demo config"
ON public.account_demo_config FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = account_demo_config.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
      AND am.role IN ('owner', 'admin')
  )
);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_account_demo_config_updated_at ON public.account_demo_config;
CREATE TRIGGER update_account_demo_config_updated_at
BEFORE UPDATE ON public.account_demo_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Função utilitária para edge functions checarem o modo demo
CREATE OR REPLACE FUNCTION public.is_account_in_demo(_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT demo_mode_active FROM public.account_demo_config WHERE account_id = _account_id),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_account_in_demo(uuid) TO authenticated, service_role, anon;