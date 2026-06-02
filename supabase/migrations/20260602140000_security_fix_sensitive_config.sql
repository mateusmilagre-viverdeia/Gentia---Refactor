-- ============================================================================
-- FIX DE SEGURANÇA 🟡 — config sensível de IA exposta entre tenants
-- ----------------------------------------------------------------------------
-- market_research_prompts e market_research_model_config tinham leitura aberta a
-- QUALQUER usuário autenticado (authenticated:SELECT USING true), expondo
-- prompts proprietários de IA e config de modelo a todos os clientes.
-- O frontend NÃO usa essas tabelas; as edge functions acessam via service_role
-- (que ignora RLS). Restringimos a leitura a super_admin. (Auditoria §4.1)
--
-- Obs.: platform_credit_config e feature_llm_mapping também expõem dados
-- sensíveis (margem, mapeamento de modelos), mas SÃO lidas pelo front (hooks de
-- custo/pricing). Corrigi-las exige uma view sem os campos sensíveis (refatoração
-- de front, fora do escopo Fase 1) — documentado como risco remanescente.
-- ============================================================================

drop policy if exists "mrp_read_auth" on public.market_research_prompts;
create policy "mrp_read_super_admin" on public.market_research_prompts
  for select to authenticated using (public.is_super_admin(auth.uid()));

drop policy if exists "mrmc_read_auth" on public.market_research_model_config;
create policy "mrmc_read_super_admin" on public.market_research_model_config
  for select to authenticated using (public.is_super_admin(auth.uid()));
