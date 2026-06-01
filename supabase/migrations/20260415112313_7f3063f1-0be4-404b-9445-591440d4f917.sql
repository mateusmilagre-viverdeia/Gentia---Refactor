
CREATE TABLE public.interview_attempt_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  candidate_profile_id UUID REFERENCES public.candidate_profiles(id) ON DELETE SET NULL,
  job_id UUID NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  score NUMERIC,
  status TEXT,
  completed_naturally BOOLEAN,
  recommendation TEXT,
  summary JSONB DEFAULT '{}',
  original_session_id UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.interview_attempt_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view attempt history"
ON public.interview_attempt_history
FOR SELECT
TO authenticated
USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

CREATE POLICY "Account members can insert attempt history"
ON public.interview_attempt_history
FOR INSERT
TO authenticated
WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

CREATE INDEX idx_attempt_history_candidate_job ON public.interview_attempt_history(candidate_id, job_id);
CREATE INDEX idx_attempt_history_account ON public.interview_attempt_history(account_id);
