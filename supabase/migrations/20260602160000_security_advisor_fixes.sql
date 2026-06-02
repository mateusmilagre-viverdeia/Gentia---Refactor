-- ============================================================================
-- FIX DE SEGURANÇA — achados do Supabase Advisor (security) que a varredura
-- manual de pg_policies não capturou. Ref: docs/SECURITY_AUDIT.md §10.
-- ============================================================================

-- 🔴 1) Views SECURITY DEFINER vazando PII (advisor: security_definer_view, ERROR)
-- ----------------------------------------------------------------------------
-- `employees_public` rodava como o dono (bypass da RLS de `employees`) e tinha
-- GRANT SELECT para `anon` — expunha nome, email, telefone, data de nascimento e
-- localização de TODOS os funcionários ativos de TODAS as empresas, sem filtro de
-- tenant, a qualquer pessoa com o anon key (público). O app não consome a view
-- (só aparece no types.ts gerado). `v_voice_interview_health_24h` (monitoramento)
-- tinha o mesmo padrão definer.
-- Correção: `security_invoker = true` faz a view respeitar a RLS do chamador
-- (cada tenant só enxerga o seu), e revoga-se o acesso de `anon`.
alter view public.employees_public set (security_invoker = true);
alter view public.v_voice_interview_health_24h set (security_invoker = true);
revoke all on public.employees_public from anon;
revoke all on public.v_voice_interview_health_24h from anon;

-- 🟢 2) search_path mutável em funções SECURITY DEFINER (advisor: function_search_path_mutable)
-- ----------------------------------------------------------------------------
-- Funções SECURITY DEFINER sem search_path fixo são vetor de "search_path
-- injection" (um schema malicioso no caminho pode sequestrar nomes não
-- qualificados). As 4 funções de fila de e-mail já qualificam tudo como `pgmq.*`,
-- então `search_path = ''` é seguro; as 2 de trigger só usam `now()` (pg_catalog).
alter function public.enqueue_email(text, jsonb)                      set search_path = '';
alter function public.read_email_batch(text, integer, integer)        set search_path = '';
alter function public.delete_email(text, bigint)                      set search_path = '';
alter function public.move_to_dlq(text, text, bigint, jsonb)          set search_path = '';
alter function public.update_job_distribution_updated_at()            set search_path = '';
alter function public.update_meeting_updated_at()                     set search_path = '';
