-- =====================================================
-- FASE 1: CORREÇÕES CRÍTICAS DE SEGURANÇA RLS
-- Foco em políticas e views, sem alterar funções existentes
-- =====================================================

-- 1. culture_interview_responses: Remover políticas públicas e restringir acesso
DROP POLICY IF EXISTS "Allow select for anyone" ON public.culture_interview_responses;
DROP POLICY IF EXISTS "Allow update for anyone" ON public.culture_interview_responses;
DROP POLICY IF EXISTS "Account members can view interview responses" ON public.culture_interview_responses;
DROP POLICY IF EXISTS "Account members can update interview responses" ON public.culture_interview_responses;

CREATE POLICY "Account members can view interview responses"
ON public.culture_interview_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.culture_interview_sessions cis
    WHERE cis.id = culture_interview_responses.session_id
    AND public.is_account_member(auth.uid(), cis.account_id)
  )
);

CREATE POLICY "Account members can update interview responses"
ON public.culture_interview_responses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.culture_interview_sessions cis
    WHERE cis.id = culture_interview_responses.session_id
    AND public.is_account_member(auth.uid(), cis.account_id)
  )
);

-- 2. employees: Criar view segura (sem dados sensíveis)
DROP VIEW IF EXISTS public.employees_public;

CREATE VIEW public.employees_public
WITH (security_invoker = on)
AS SELECT 
  id,
  account_id,
  full_name,
  department,
  job_title,
  is_active,
  profile_id,
  created_at,
  updated_at
FROM public.employees;

-- Política restritiva na tabela base
DROP POLICY IF EXISTS "Users can view employees in their organization" ON public.employees;
DROP POLICY IF EXISTS "Account members can view employees basic info" ON public.employees;

CREATE POLICY "Account members can view employees basic info"
ON public.employees
FOR SELECT
USING (
  public.is_account_member(auth.uid(), account_id)
);

-- 3. recruitment_candidates: Restringir acesso
DROP POLICY IF EXISTS "Anyone can view candidates" ON public.recruitment_candidates;
DROP POLICY IF EXISTS "Account members can view their candidates" ON public.recruitment_candidates;

CREATE POLICY "Account members can view their candidates"
ON public.recruitment_candidates
FOR SELECT
USING (
  public.is_account_member(auth.uid(), account_id)
);

-- 4. talent_pool: Adicionar RLS restritiva
ALTER TABLE IF EXISTS public.talent_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view talent pool" ON public.talent_pool;
DROP POLICY IF EXISTS "Anyone can insert to talent pool" ON public.talent_pool;
DROP POLICY IF EXISTS "Account members can view talent pool" ON public.talent_pool;
DROP POLICY IF EXISTS "Account members can manage talent pool" ON public.talent_pool;

CREATE POLICY "Account members can view talent pool"
ON public.talent_pool
FOR SELECT
USING (
  public.is_account_member(auth.uid(), account_id)
);

CREATE POLICY "Account members can manage talent pool"
ON public.talent_pool
FOR ALL
USING (
  public.is_account_member(auth.uid(), account_id)
);

-- 5. profiles: Criar view pública sem email
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = on)
AS SELECT 
  id,
  first_name,
  last_name,
  account_id,
  created_at,
  updated_at
FROM public.profiles;