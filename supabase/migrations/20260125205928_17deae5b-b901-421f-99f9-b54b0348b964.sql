-- =============================================
-- Phase 5: Candidate Opt-Out (LGPD Compliance)
-- =============================================

-- 1. Create candidate_marketplace_preferences table
CREATE TABLE public.candidate_marketplace_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_email TEXT NOT NULL UNIQUE,
  allow_marketplace_sharing BOOLEAN DEFAULT true,
  opted_out_at TIMESTAMPTZ,
  opt_out_reason TEXT,
  preferences_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_candidate_marketplace_prefs_email ON public.candidate_marketplace_preferences(candidate_email);
CREATE INDEX idx_candidate_marketplace_prefs_token ON public.candidate_marketplace_preferences(preferences_token) WHERE preferences_token IS NOT NULL;

-- Enable RLS
ALTER TABLE public.candidate_marketplace_preferences ENABLE ROW LEVEL SECURITY;

-- RLS: Allow public read/update via valid token (for magic link access)
CREATE POLICY "Allow token-based access to preferences"
ON public.candidate_marketplace_preferences
FOR ALL
USING (
  preferences_token IS NOT NULL 
  AND token_expires_at > now()
);

-- RLS: Service role can do everything
CREATE POLICY "Service role full access to preferences"
ON public.candidate_marketplace_preferences
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Add notification_sent flag to shared_talent_pool
ALTER TABLE public.shared_talent_pool 
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ;

-- 3. Update the trigger function to check opt-out before adding
CREATE OR REPLACE FUNCTION public.add_to_shared_talent_pool()
RETURNS TRIGGER AS $$
DECLARE
  v_candidate RECORD;
  v_culture_session RECORD;
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

  -- Check if already in pool for this account
  SELECT id INTO v_existing_entry
  FROM shared_talent_pool
  WHERE source_candidate_id = NEW.id
    AND source_account_id = v_candidate.account_id;

  IF v_existing_entry IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Insert into shared talent pool
  INSERT INTO shared_talent_pool (
    source_candidate_id,
    source_account_id,
    anonymized_name,
    skills,
    experience_years,
    location,
    disc_primary,
    disc_secondary,
    cultural_fit_score,
    cultural_values,
    source_job_title
  )
  SELECT
    NEW.id,
    v_candidate.account_id,
    'Candidato #' || substr(md5(v_candidate.email), 1, 6),
    v_candidate.skills,
    v_candidate.experience_years,
    v_candidate.location,
    cdr.primary_profile,
    cdr.secondary_profile,
    v_culture_session.overall_score,
    v_culture_session.cultural_values,
    rj.title
  FROM recruitment_candidates rc
  LEFT JOIN candidate_disc_sessions cds ON cds.candidate_id = rc.id
  LEFT JOIN candidate_disc_results cdr ON cdr.session_id = cds.id
  LEFT JOIN recruitment_jobs rj ON rj.id = rc.job_id
  WHERE rc.id = NEW.id
  LIMIT 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Create function to handle opt-out and remove from pool
CREATE OR REPLACE FUNCTION public.handle_marketplace_opt_out()
RETURNS TRIGGER AS $$
BEGIN
  -- If candidate opted out, mark all their pool entries as opted_out
  IF NEW.allow_marketplace_sharing = false AND (OLD.allow_marketplace_sharing IS NULL OR OLD.allow_marketplace_sharing = true) THEN
    UPDATE shared_talent_pool
    SET opted_out = true, updated_at = now()
    WHERE source_candidate_id IN (
      SELECT id FROM recruitment_candidates WHERE email = NEW.candidate_email
    );
    
    NEW.opted_out_at = now();
  END IF;
  
  -- If candidate opted back in, remove opted_out flag
  IF NEW.allow_marketplace_sharing = true AND OLD.allow_marketplace_sharing = false THEN
    UPDATE shared_talent_pool
    SET opted_out = false, updated_at = now()
    WHERE source_candidate_id IN (
      SELECT id FROM recruitment_candidates WHERE email = NEW.candidate_email
    );
    
    NEW.opted_out_at = NULL;
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for opt-out handling
CREATE TRIGGER trg_handle_marketplace_opt_out
BEFORE UPDATE ON public.candidate_marketplace_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_marketplace_opt_out();