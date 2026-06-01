
-- ============================================
-- Fase 6A: Histórico Consolidado de Participação
-- ============================================

CREATE TABLE public.candidate_process_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.recruitment_jobs(id) ON DELETE SET NULL,
  job_title TEXT NOT NULL,
  company_context TEXT,
  final_status TEXT NOT NULL DEFAULT 'unknown',
  rejection_reason TEXT,
  feedback_notes TEXT,
  qualification_score INTEGER,
  was_shortlisted BOOLEAN DEFAULT false,
  participated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cph_account ON public.candidate_process_history(account_id);
CREATE INDEX idx_cph_candidate ON public.candidate_process_history(candidate_id);
CREATE INDEX idx_cph_job ON public.candidate_process_history(job_id);
CREATE INDEX idx_cph_status ON public.candidate_process_history(final_status);

ALTER TABLE public.candidate_process_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view process history"
  ON public.candidate_process_history FOR SELECT
  TO authenticated
  USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can create process history"
  ON public.candidate_process_history FOR INSERT
  TO authenticated
  WITH CHECK (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can update process history"
  ON public.candidate_process_history FOR UPDATE
  TO authenticated
  USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can delete process history"
  ON public.candidate_process_history FOR DELETE
  TO authenticated
  USING (public.is_account_member(auth.uid(), account_id));

-- Trigger: auto-populate history when application reaches final status
CREATE OR REPLACE FUNCTION public.auto_populate_process_history()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_candidate RECORD;
  v_job RECORD;
  v_final_status TEXT;
  v_was_shortlisted BOOLEAN;
BEGIN
  -- Only trigger on status change to final statuses
  IF NEW.status NOT IN ('hired', 'rejected', 'disqualified', 'withdrawn') THEN
    RETURN NEW;
  END IF;

  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Map application status to history status
  v_final_status := CASE NEW.status
    WHEN 'hired' THEN 'hired'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'disqualified' THEN 'rejected'
    WHEN 'withdrawn' THEN 'withdrew'
    ELSE 'unknown'
  END;

  -- Get candidate data
  SELECT * INTO v_candidate
  FROM recruitment_candidates
  WHERE id = NEW.candidate_id;

  IF v_candidate IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get job data
  SELECT * INTO v_job
  FROM recruitment_jobs
  WHERE id = NEW.job_id;

  -- Check if was ever shortlisted
  SELECT EXISTS (
    SELECT 1 FROM recruitment_applications
    WHERE candidate_id = NEW.candidate_id
      AND job_id = NEW.job_id
      AND stage IN ('shortlist', 'final_interview', 'offer')
  ) INTO v_was_shortlisted;

  -- Avoid duplicates
  IF EXISTS (
    SELECT 1 FROM candidate_process_history
    WHERE candidate_id = NEW.candidate_id
      AND job_id = NEW.job_id
  ) THEN
    UPDATE candidate_process_history
    SET final_status = v_final_status,
        was_shortlisted = v_was_shortlisted,
        participated_at = now()
    WHERE candidate_id = NEW.candidate_id
      AND job_id = NEW.job_id;
    RETURN NEW;
  END IF;

  INSERT INTO candidate_process_history (
    account_id, candidate_id, job_id, job_title,
    final_status, was_shortlisted, participated_at
  ) VALUES (
    v_candidate.account_id,
    NEW.candidate_id,
    NEW.job_id,
    COALESCE(v_job.title, 'Vaga não identificada'),
    v_final_status,
    v_was_shortlisted,
    now()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_process_history
  AFTER UPDATE ON public.recruitment_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_process_history();

-- ============================================
-- Fase 6B: Talent Bank Matches
-- ============================================

CREATE TABLE public.talent_bank_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  similarity_score FLOAT NOT NULL DEFAULT 0,
  match_reasoning TEXT,
  source_history_ids UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, candidate_id)
);

CREATE INDEX idx_tbm_account ON public.talent_bank_matches(account_id);
CREATE INDEX idx_tbm_job ON public.talent_bank_matches(job_id);
CREATE INDEX idx_tbm_candidate ON public.talent_bank_matches(candidate_id);
CREATE INDEX idx_tbm_status ON public.talent_bank_matches(status);
CREATE INDEX idx_tbm_score ON public.talent_bank_matches(similarity_score DESC);

ALTER TABLE public.talent_bank_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view talent bank matches"
  ON public.talent_bank_matches FOR SELECT
  TO authenticated
  USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can create talent bank matches"
  ON public.talent_bank_matches FOR INSERT
  TO authenticated
  WITH CHECK (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can update talent bank matches"
  ON public.talent_bank_matches FOR UPDATE
  TO authenticated
  USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can delete talent bank matches"
  ON public.talent_bank_matches FOR DELETE
  TO authenticated
  USING (public.is_account_member(auth.uid(), account_id));

-- ============================================
-- Fase 6C: Colunas extras em outreach conversations
-- ============================================

ALTER TABLE public.recruitment_outreach_conversations
  ADD COLUMN IF NOT EXISTS reactivation_context JSONB,
  ADD COLUMN IF NOT EXISTS response_classification TEXT;
