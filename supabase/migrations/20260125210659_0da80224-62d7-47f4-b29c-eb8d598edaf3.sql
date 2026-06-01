-- Add notification_sent_at column to track when email was sent (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'shared_talent_pool' 
    AND column_name = 'notification_sent_at'
  ) THEN
    ALTER TABLE public.shared_talent_pool 
    ADD COLUMN notification_sent_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create function to notify candidate when added to talent pool
-- Uses pg_net extension for async HTTP calls to edge function
CREATE OR REPLACE FUNCTION notify_candidate_pool_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_edge_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Skip if notification already sent (shouldn't happen on INSERT but safety check)
  IF NEW.notification_sent_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if is_visible is false (candidate opted out before being added)
  IF NEW.is_visible = false THEN
    RETURN NEW;
  END IF;

  -- Build edge function URL
  v_edge_url := CONCAT(
    current_setting('app.settings.supabase_url', true),
    '/functions/v1/send-talent-pool-notification'
  );

  -- Get service role key for auth
  v_service_key := current_setting('app.settings.supabase_service_key', true);

  -- If settings not available, try env vars as fallback
  IF v_edge_url IS NULL OR v_edge_url = '/functions/v1/send-talent-pool-notification' THEN
    v_edge_url := 'https://axumduklmiiptumdsgtu.supabase.co/functions/v1/send-talent-pool-notification';
  END IF;

  -- Call edge function asynchronously via pg_net if available
  -- If pg_net is not enabled, this will silently fail (non-blocking)
  BEGIN
    PERFORM net.http_post(
      url := v_edge_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_service_key, current_setting('supabase.service_role_key', true))
      ),
      body := jsonb_build_object(
        'pool_entry_id', NEW.id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- pg_net not available or error - log but don't block
    RAISE NOTICE 'Could not send talent pool notification: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic notification on pool entry
DROP TRIGGER IF EXISTS trg_notify_candidate_pool_entry ON shared_talent_pool;

CREATE TRIGGER trg_notify_candidate_pool_entry
AFTER INSERT ON shared_talent_pool
FOR EACH ROW
EXECUTE FUNCTION notify_candidate_pool_entry();

-- Add comment for documentation
COMMENT ON FUNCTION notify_candidate_pool_entry() IS 
'Automatically sends email notification to candidates when added to shared talent pool. Uses pg_net for async HTTP calls to edge function.';

COMMENT ON TRIGGER trg_notify_candidate_pool_entry ON shared_talent_pool IS 
'Triggers email notification when a candidate is added to the shared talent pool (LGPD compliance).';