-- Fix search_path for the notification function
CREATE OR REPLACE FUNCTION notify_candidate_pool_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Build edge function URL (hardcoded for reliability)
  v_edge_url := 'https://axumduklmiiptumdsgtu.supabase.co/functions/v1/send-talent-pool-notification';

  -- Call edge function asynchronously via pg_net if available
  -- If pg_net is not enabled, this will silently fail (non-blocking)
  BEGIN
    PERFORM net.http_post(
      url := v_edge_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
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
$$;