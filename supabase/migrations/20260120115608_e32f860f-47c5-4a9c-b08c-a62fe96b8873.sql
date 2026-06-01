-- Schedule daily CRON job to expire trials at 03:00 UTC
SELECT cron.schedule(
  'expire-trials-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://axumduklmiiptumdsgtu.supabase.co/functions/v1/expire-trials',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);