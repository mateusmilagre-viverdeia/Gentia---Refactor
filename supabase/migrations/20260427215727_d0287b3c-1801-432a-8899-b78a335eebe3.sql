-- 1) Auto-expire commercial proposals whose validity_date has passed
CREATE OR REPLACE FUNCTION public.expire_overdue_commercial_proposals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.commercial_proposals
     SET status = 'expired'::commercial_proposal_status,
         updated_at = now()
   WHERE status IN ('sent','viewed')
     AND validity_date IS NOT NULL
     AND validity_date < CURRENT_DATE;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- 2) Schedule daily account health calculation (03:00 UTC)
DO $$
BEGIN
  PERFORM cron.unschedule('daily-account-health');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'daily-account-health',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://axumduklmiiptumdsgtu.supabase.co/functions/v1/calculate-account-health',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-cron-secret', coalesce(current_setting('app.cron_secret', true), '')
    ),
    body := jsonb_build_object('mode','all')
  );
  $$
);

-- 3) Schedule daily proposal expiration sweep (03:15 UTC)
DO $$
BEGIN
  PERFORM cron.unschedule('daily-expire-proposals');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'daily-expire-proposals',
  '15 3 * * *',
  $$ SELECT public.expire_overdue_commercial_proposals(); $$
);