-- Dashboard de saúde do BANCO (Frente B/observabilidade — entregável "dashboards").
-- Espelha ops_ai_metrics (custo de IA): RPC super_admin que retorna um snapshot JSON
-- com conexões, tamanho do banco, cache hit ratio, maiores tabelas e queries lentas
-- (pg_stat_statements). Gated por is_super_admin (raise 42501 se não for).
-- (pg_catalog é implícito mesmo com search_path=''; qualifico só public/auth/extensions.)

create or replace function public.ops_db_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_result jsonb;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'connections', (
      select jsonb_build_object(
        'total', count(*),
        'active', count(*) filter (where state = 'active'),
        'idle', count(*) filter (where state = 'idle'),
        'max', (select setting::int from pg_settings where name = 'max_connections')
      ) from pg_stat_activity
    ),
    'db_size', pg_size_pretty(pg_database_size(current_database())),
    'cache_hit_pct', (
      select round(sum(blks_hit) * 100.0 / nullif(sum(blks_hit) + sum(blks_read), 0), 2)
      from pg_stat_database where datname = current_database()
    ),
    'top_tables', (
      select jsonb_agg(t) from (
        select relname as tabela, n_live_tup as linhas,
          pg_size_pretty(pg_total_relation_size(relid)) as tamanho
        from pg_stat_user_tables
        order by pg_total_relation_size(relid) desc limit 10
      ) t
    ),
    'slow_queries', (
      select coalesce(jsonb_agg(q), '[]'::jsonb) from (
        select left(query, 120) as query, calls,
          round(total_exec_time::numeric, 0) as total_ms,
          round(mean_exec_time::numeric, 2) as mean_ms, rows
        from extensions.pg_stat_statements
        order by total_exec_time desc limit 10
      ) q
    )
  ) into v_result;

  return v_result;
end
$function$;

revoke all on function public.ops_db_metrics() from public;
revoke all on function public.ops_db_metrics() from anon;
grant execute on function public.ops_db_metrics() to authenticated;
