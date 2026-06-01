
-- Fix sync_marketplace_optout function to use candidate_id instead of source_candidate_id
CREATE OR REPLACE FUNCTION public.sync_marketplace_optout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If candidate opted out, mark all their pool entries as opted_out
  IF NEW.allow_marketplace_sharing = false AND (OLD.allow_marketplace_sharing IS NULL OR OLD.allow_marketplace_sharing = true) THEN
    UPDATE shared_talent_pool
    SET opted_out = true, updated_at = now()
    WHERE candidate_id IN (
      SELECT id FROM recruitment_candidates WHERE email = NEW.candidate_email
    );
    
    NEW.opted_out_at = now();
  END IF;
  
  -- If candidate opted back in, remove opted_out flag
  IF NEW.allow_marketplace_sharing = true AND OLD.allow_marketplace_sharing = false THEN
    UPDATE shared_talent_pool
    SET opted_out = false, updated_at = now()
    WHERE candidate_id IN (
      SELECT id FROM recruitment_candidates WHERE email = NEW.candidate_email
    );
    
    NEW.opted_out_at = NULL;
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
