CREATE OR REPLACE FUNCTION public.trigger_regenerate_indeed_feed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  should_trigger BOOLEAN := false;
BEGIN
  IF COALESCE(NEW.is_demo, false) = true THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    should_trigger := (NEW.status = 'open');
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN should_trigger := true; END IF;
    IF OLD.title IS DISTINCT FROM NEW.title THEN should_trigger := true; END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN should_trigger := true; END IF;
    IF OLD.location IS DISTINCT FROM NEW.location THEN should_trigger := true; END IF;
  END IF;

  IF should_trigger THEN
    BEGIN
      PERFORM net.http_post(
        url := 'https://axumduklmiiptumdsgtu.supabase.co/functions/v1/generate-indeed-feed',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object('account_id', NEW.account_id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'trigger_regenerate_indeed_feed failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;