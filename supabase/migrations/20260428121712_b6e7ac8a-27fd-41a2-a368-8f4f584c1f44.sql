
-- Agendar regeneração diária dos feeds Indeed às 06:00 UTC
SELECT cron.schedule(
  'indeed-feed-daily-regen',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://axumduklmiiptumdsgtu.supabase.co/functions/v1/generate-indeed-feed',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
