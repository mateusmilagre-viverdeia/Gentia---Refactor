-- ============================================================================
-- FIX DE SEGURANÇA 🔴 — Vazamento de PII no portal de cliente
-- ----------------------------------------------------------------------------
-- 8 tabelas tinham policies RLS `USING (true)` para o role `anon`, permitindo
-- que QUALQUER pessoa não autenticada (anon key é público) lesse dados pessoais
-- de candidatos, candidaturas, vagas e clientes de TODAS as empresas — e até
-- um UPDATE em portal_clientes_acesso. (Auditoria: docs/SECURITY_AUDIT.md §3.1)
--
-- A segurança do "portal de cliente" (acesso por token) passa a ser feita
-- exclusivamente pela edge function `portal-data`, que valida o token no
-- servidor (SECURITY DEFINER / service_role) e devolve apenas os dados do
-- cliente daquele token. O acesso AUTENTICADO do app (policies por
-- account_members) NÃO é afetado — só removemos a exposição a `anon`.
--
-- A reativação funcional do portal no frontend (refatoração de hooks/componentes
-- para chamar `portal-data`) está documentada como item à parte (fora do escopo
-- de Fase 1, que exclui refatoração de front-end).
-- ============================================================================

drop policy if exists "anon_portal_clientes_select"        on public.clientes_consultoria;
drop policy if exists "anon_portal_contatos_select"        on public.clientes_contatos;
drop policy if exists "Portal access by token"             on public.portal_clientes_acesso;
drop policy if exists "anon_portal_select_by_token"        on public.portal_clientes_acesso;
drop policy if exists "anon_portal_update_ultimo_acesso"   on public.portal_clientes_acesso;
drop policy if exists "anon_portal_feedback_select"        on public.portal_feedbacks;
drop policy if exists "anon_portal_applications_select"    on public.recruitment_applications;
drop policy if exists "anon_portal_candidates_select"      on public.recruitment_candidates;
drop policy if exists "anon_portal_jobs_select"            on public.recruitment_jobs;
drop policy if exists "Public can view reports by token"   on public.shortlist_relatorios;
