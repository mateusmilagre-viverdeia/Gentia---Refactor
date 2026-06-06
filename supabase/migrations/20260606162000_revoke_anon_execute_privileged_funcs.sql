-- Hardening de superfície de ataque: remove o acesso de `anon` a funções
-- SECURITY DEFINER PRIVILEGIADAS que NÃO são RPCs públicas nem helpers de RLS.
--
-- NUANCE DO ACL: nessas funções o execute de `anon` NÃO é um grant explícito —
-- vem do grant a `PUBLIC` (ACL `=X/...`). O ACL típico é:
--   {=X/postgres, postgres=X, authenticated=X, service_role=X}
-- ou seja: PUBLIC + authenticated + service_role (sem `anon` explícito). Por isso
-- `REVOKE ... FROM anon` é no-op; o correto é `REVOKE ... FROM PUBLIC`.
--
-- Para NÃO afetar usuários autenticados nem edge functions, primeiro GARANTIMOS
-- grants EXPLÍCITOS a `authenticated` e `service_role` (idempotente) e só então
-- revogamos de PUBLIC (e de anon, por garantia). Efeito líquido: SÓ `anon` perde.
--
-- MANTÉM `anon` em: funções referenciadas em policies RLS, RPCs por token
-- (*_token*) e as RPCs públicas legítimas no NOT IN (NPS, portal funnel/events,
-- ROI/share/career/unlock counters, get_public_job). Operações sensíveis fechadas:
-- add_credits/consume_credits/refund_credits, assign_ep_role/assign_candidate_role/
-- remove_ep_role, admin_*, get_company_*_detail, matching/search, filas de email.
--
-- Idempotente.

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and has_function_privilege('anon', p.oid, 'execute')
      and p.prorettype <> 'pg_catalog.trigger'::regtype
      and p.proname not like '%token%'
      and not exists (
        select 1 from pg_policies pol
        where pol.schemaname = 'public'
          and (coalesce(pol.qual, '') || coalesce(pol.with_check, '')) ilike '%' || p.proname || '%'
      )
      and p.proname not in (
        'get_nps_context', 'submit_nps_response',
        'get_portal_funnel_counts', 'mark_portal_events_seen',
        'increment_roi_report_view', 'increment_share_view_count',
        'get_public_job', 'increment_career_page_views',
        'increment_career_page_applications', 'increment_unlock_count'
      )
  loop
    execute format('grant execute on function %s to authenticated, service_role', r.sig);
    execute format('revoke execute on function %s from public', r.sig);
    execute format('revoke execute on function %s from anon', r.sig);
  end loop;
end $$;
