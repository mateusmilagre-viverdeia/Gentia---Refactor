-- ============================================================================
-- CUTOVER: reapontar crons (ORIGEM Lovable -> DESTINO) + agendar ops-health-monitor
-- ----------------------------------------------------------------------------
-- Rodar NO DESTINO (tdyvuomybimgygjgvnrk), na fase 5 do RUNBOOK_CUTOVER.
-- ⚠️ SUBSTITUIR os placeholders <DEST_ANON_KEY> e <CRON_SECRET> pelos valores
--    REAIS do destino antes de rodar. NUNCA commitar este arquivo com valores reais.
-- Pré-requisitos: extensões pg_cron + pg_net (já habilitadas no destino).
--
-- Contexto: 6 crons no total. 4 chamavam edge functions via http na ORIGEM
-- (reapontados abaixo). 2 são SQL puro e rodam in-place (NÃO precisam mudar):
--   - daily-expire-proposals
--   - process-one-on-one-recurrences
-- ============================================================================

-- 1) daily-account-health -> calculate-account-health (03:00)
select cron.unschedule('daily-account-health');
select cron.schedule('daily-account-health', '0 3 * * *', $$
  select net.http_post(
    url     := 'https://tdyvuomybimgygjgvnrk.supabase.co/functions/v1/calculate-account-health',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <DEST_ANON_KEY>','x-cron-secret','<CRON_SECRET>'),
    body    := '{}'::jsonb
  );
$$);

-- 2) expire-trials-daily -> expire-trials (03:00)
select cron.unschedule('expire-trials-daily');
select cron.schedule('expire-trials-daily', '0 3 * * *', $$
  select net.http_post(
    url     := 'https://tdyvuomybimgygjgvnrk.supabase.co/functions/v1/expire-trials',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <DEST_ANON_KEY>','x-cron-secret','<CRON_SECRET>'),
    body    := '{}'::jsonb
  );
$$);

-- 3) indeed-feed-daily-regen -> generate-indeed-feed (06:00)
select cron.unschedule('indeed-feed-daily-regen');
select cron.schedule('indeed-feed-daily-regen', '0 6 * * *', $$
  select net.http_post(
    url     := 'https://tdyvuomybimgygjgvnrk.supabase.co/functions/v1/generate-indeed-feed',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <DEST_ANON_KEY>','x-cron-secret','<CRON_SECRET>'),
    body    := '{}'::jsonb
  );
$$);

-- 4) sla-monitor-daily -> sla-monitor (11:00)
select cron.unschedule('sla-monitor-daily');
select cron.schedule('sla-monitor-daily', '0 11 * * *', $$
  select net.http_post(
    url     := 'https://tdyvuomybimgygjgvnrk.supabase.co/functions/v1/sla-monitor',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <DEST_ANON_KEY>','x-cron-secret','<CRON_SECRET>'),
    body    := '{}'::jsonb
  );
$$);

-- 5) NOVO: ops-health-monitor (Frente B) — de hora em hora. Valida via x-cron-secret.
select cron.schedule('ops-health-monitor-hourly', '0 * * * *', $$
  select net.http_post(
    url     := 'https://tdyvuomybimgygjgvnrk.supabase.co/functions/v1/ops-health-monitor',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','<CRON_SECRET>'),
    body    := '{}'::jsonb
  );
$$);

-- ----------------------------------------------------------------------------
-- VERIFICAÇÃO (rodar depois): nenhum job deve apontar para a origem.
-- ----------------------------------------------------------------------------
select jobname, schedule, active,
       case when command ilike '%axumduklmiiptumdsgtu%' then 'ORIGEM (CORRIGIR!)'
            when command ilike '%tdyvuomybimgygjgvnrk%' then 'destino OK'
            else 'sql puro' end as aponta_para
from cron.job order by jobname;
