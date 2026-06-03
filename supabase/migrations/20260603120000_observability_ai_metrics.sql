-- ============================================================================
-- OBSERVABILIDADE (Frente B) — métricas operacionais de IA sobre ai_execution_logs
-- ----------------------------------------------------------------------------
-- ai_execution_logs já registra cada chamada de IA (custo, tokens, status,
-- latência, cache, qualidade). Aqui criamos a camada de LEITURA agregada para
-- dashboards/alertas, sem expor dados entre tenants:
--   * Views (security_invoker) com GRANT só para service_role — exploração via
--     SQL/admin; sem acesso de anon/authenticated.
--   * RPC ops_ai_metrics() SECURITY DEFINER que valida super_admin e devolve um
--     resumo global em JSON para o painel admin.
-- ============================================================================

-- Custo/uso/erros de IA por dia ---------------------------------------------
create or replace view public.v_ops_ai_cost_daily
with (security_invoker = true) as
select
  created_at::date                                              as dia,
  count(*)                                                      as chamadas,
  count(*) filter (where status = 'error')                      as erros,
  count(*) filter (where status = 'timeout')                    as timeouts,
  count(*) filter (where status = 'fallback')                   as fallbacks,
  coalesce(sum(tokens_used), 0)                                 as tokens,
  coalesce(sum(cached_tokens), 0)                               as cached_tokens,
  round(coalesce(sum(estimated_cost), 0)::numeric, 4)           as custo_usd,
  round(avg(duration_ms))::int                                  as latencia_media_ms
from public.ai_execution_logs
group by 1;

-- Por função (últimos 30 dias) ----------------------------------------------
create or replace view public.v_ops_ai_by_function
with (security_invoker = true) as
select
  function_name,
  count(*)                                                                          as chamadas,
  round(coalesce(sum(estimated_cost), 0)::numeric, 4)                               as custo_usd,
  round(avg(duration_ms))::int                                                      as latencia_media_ms,
  round(percentile_cont(0.95) within group (order by duration_ms))::int             as latencia_p95_ms,
  round(100.0 * count(*) filter (where status in ('error','timeout'))
        / nullif(count(*), 0), 1)                                                   as erro_pct
from public.ai_execution_logs
where created_at > now() - interval '30 days'
group by 1;

-- Por modelo (últimos 30 dias) — base para a Frente F (custos por modelo) -----
create or replace view public.v_ops_ai_by_model
with (security_invoker = true) as
select
  coalesce(model, '(desconhecido)')                            as model,
  count(*)                                                     as chamadas,
  coalesce(sum(tokens_used), 0)                                as tokens,
  coalesce(sum(cached_tokens), 0)                              as cached_tokens,
  round(coalesce(sum(estimated_cost), 0)::numeric, 4)          as custo_usd
from public.ai_execution_logs
where created_at > now() - interval '30 days'
group by 1;

-- Erros/timeouts recentes (últimos 7 dias) ----------------------------------
create or replace view public.v_ops_ai_errors_recent
with (security_invoker = true) as
select created_at, function_name, model, status,
       left(coalesce(error_message, ''), 200) as erro, account_id
from public.ai_execution_logs
where status in ('error','timeout') and created_at > now() - interval '7 days'
order by created_at desc;

-- Acesso: só service_role explora as views; o painel admin usa a RPC abaixo.
revoke all on public.v_ops_ai_cost_daily, public.v_ops_ai_by_function,
              public.v_ops_ai_by_model, public.v_ops_ai_errors_recent
  from anon, authenticated;
grant select on public.v_ops_ai_cost_daily, public.v_ops_ai_by_function,
                public.v_ops_ai_by_model, public.v_ops_ai_errors_recent
  to service_role;

-- RPC de resumo para o painel admin (valida super_admin; bypassa RLS por DEFINER)
create or replace function public.ops_ai_metrics(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'periodo_dias',       p_days,
    'chamadas',           count(*),
    'custo_usd',          round(coalesce(sum(estimated_cost), 0)::numeric, 4),
    'tokens',             coalesce(sum(tokens_used), 0),
    'cached_tokens',      coalesce(sum(cached_tokens), 0),
    'erro_pct',           round(100.0 * count(*) filter (where status in ('error','timeout'))
                                / nullif(count(*), 0), 1),
    'latencia_media_ms',  round(avg(duration_ms))::int,
    'custo_hoje_usd',     round(coalesce(sum(estimated_cost)
                                filter (where created_at::date = current_date), 0)::numeric, 4),
    'top_funcoes', (
      select jsonb_agg(t) from (
        select function_name,
               count(*) as chamadas,
               round(coalesce(sum(estimated_cost), 0)::numeric, 4) as custo_usd
        from public.ai_execution_logs
        where created_at > now() - (p_days || ' days')::interval
        group by 1 order by 3 desc nulls last limit 10
      ) t)
  )
  into v_result
  from public.ai_execution_logs
  where created_at > now() - (p_days || ' days')::interval;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

revoke all on function public.ops_ai_metrics(int) from public, anon;
grant execute on function public.ops_ai_metrics(int) to authenticated, service_role;
