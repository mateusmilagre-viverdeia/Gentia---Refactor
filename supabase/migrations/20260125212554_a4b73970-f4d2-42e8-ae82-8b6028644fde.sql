
-- Fix add_to_shared_talent_pool function to use correct column names
CREATE OR REPLACE FUNCTION public.add_to_shared_talent_pool()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate RECORD;
  v_culture_session RECORD;
  v_disc_result RECORD;
  v_allows_sharing BOOLEAN;
  v_existing_entry UUID;
BEGIN
  -- Only trigger on status change to disqualified or rejected
  IF NEW.status NOT IN ('disqualified', 'rejected') THEN
    RETURN NEW;
  END IF;
  
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get candidate data
  SELECT * INTO v_candidate
  FROM recruitment_candidates
  WHERE id = NEW.id;

  IF v_candidate IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if candidate has opted out
  SELECT allow_marketplace_sharing INTO v_allows_sharing
  FROM candidate_marketplace_preferences
  WHERE candidate_email = v_candidate.email;

  -- If explicitly opted out, don't add to pool
  IF v_allows_sharing = false THEN
    RETURN NEW;
  END IF;

  -- Check if candidate has a completed culture interview session
  SELECT * INTO v_culture_session
  FROM culture_interview_sessions cis
  WHERE cis.candidate_id = NEW.id
    AND cis.status = 'completed'
  ORDER BY cis.completed_at DESC
  LIMIT 1;

  -- Only add if has culture interview
  IF v_culture_session IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if already in pool for this account (use candidate_id, not source_candidate_id)
  SELECT id INTO v_existing_entry
  FROM shared_talent_pool
  WHERE candidate_id = NEW.id
    AND source_account_id = v_candidate.account_id;

  IF v_existing_entry IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get DISC result
  SELECT cdr.* INTO v_disc_result
  FROM candidate_disc_sessions cds
  JOIN candidate_disc_results cdr ON cdr.session_id = cds.id
  WHERE cds.candidate_id = NEW.id
  ORDER BY cds.completed_at DESC NULLS LAST
  LIMIT 1;

  -- Insert into shared talent pool with correct column names
  INSERT INTO shared_talent_pool (
    candidate_id,
    source_account_id,
    cultural_score,
    disc_primary,
    disc_secondary,
    disc_scores
  ) VALUES (
    NEW.id,
    v_candidate.account_id,
    v_culture_session.overall_score,
    v_disc_result.primary_profile,
    v_disc_result.secondary_profile,
    jsonb_build_object(
      'd', v_disc_result.d_normalized,
      'i', v_disc_result.i_normalized,
      's', v_disc_result.s_normalized,
      'c', v_disc_result.c_normalized
    )
  );

  RETURN NEW;
END;
$$;

-- Fix notify_candidate_pool_entry to remove is_visible check (column doesn't exist)
CREATE OR REPLACE FUNCTION public.notify_candidate_pool_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edge_url TEXT;
BEGIN
  -- Skip if notification already sent
  IF NEW.notification_sent_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if opted out
  IF NEW.opted_out = true THEN
    RETURN NEW;
  END IF;

  -- Build edge function URL
  v_edge_url := 'https://axumduklmiiptumdsgtu.supabase.co/functions/v1/send-talent-pool-notification';

  -- Call edge function asynchronously via pg_net
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
    RAISE NOTICE 'Could not send talent pool notification: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
