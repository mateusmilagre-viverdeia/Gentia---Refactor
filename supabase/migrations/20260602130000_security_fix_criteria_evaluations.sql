-- ============================================================================
-- FIX DE SEGURANÇA 🔴 — culture_interview_criteria_evaluations (public:ALL)
-- ----------------------------------------------------------------------------
-- A policy "Service role can manage criteria evaluations" estava configurada
-- como role `public` com USING(true) e comando ALL (erro: o nome sugere
-- service_role, mas o role aplicado era `public`). Isso permitia que qualquer
-- usuário (inclusive anon) lesse e ESCREVESSE avaliações de critérios de
-- entrevista. (Auditoria: docs/SECURITY_AUDIT.md §3.2)
--
-- Correção: remover a policy. A LEITURA continua protegida pela policy
-- "Account members can view criteria evaluations" (valida is_account_member via
-- culture_interview_sessions). A ESCRITA é feita por edge functions usando
-- service_role, que ignora RLS — não precisa de policy `public`.
-- ============================================================================

drop policy if exists "Service role can manage criteria evaluations" on public.culture_interview_criteria_evaluations;
