-- ============================================================================
-- OBSERVABILIDADE (Frente B) — tabela de alertas OPERACIONAIS
-- ----------------------------------------------------------------------------
-- As tabelas de alerta existentes são de DOMÍNIO (sla_alertas, pulse_alerts,
-- recruitment_metric_alerts...). Esta é a camada OPERACIONAL/infra: custo de IA
-- anormal, pico de erros de função, jobs travados — alimentada pela edge
-- function `ops-health-monitor` (cron). Leitura restrita a super_admin; escrita
-- via service_role (a function ignora RLS).
-- ============================================================================

create table if not exists public.ops_alerts (
  id          uuid primary key default gen_random_uuid(),
  alert_type  text not null,                       -- ai_cost | ai_error_rate | fn_errors | cron_stuck | db
  severity    text not null default 'warning',     -- info | warning | high | critical
  message     text not null,
  details     jsonb not null default '{}'::jsonb,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_ops_alerts_created   on public.ops_alerts (created_at desc);
create index if not exists idx_ops_alerts_unresolved on public.ops_alerts (created_at desc) where resolved = false;

alter table public.ops_alerts enable row level security;

-- Leitura: apenas super_admin (painel ops). Escrita: service_role (bypassa RLS).
create policy "ops_alerts: super_admin lê" on public.ops_alerts
  for select to authenticated
  using (public.is_super_admin((select auth.uid())));

create policy "ops_alerts: super_admin resolve" on public.ops_alerts
  for update to authenticated
  using (public.is_super_admin((select auth.uid())))
  with check (public.is_super_admin((select auth.uid())));

grant select, update on public.ops_alerts to authenticated;
