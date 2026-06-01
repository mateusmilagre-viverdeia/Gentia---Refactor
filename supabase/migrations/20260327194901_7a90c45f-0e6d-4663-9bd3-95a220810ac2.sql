
-- Candidates can view their own DISC sessions (recruitment context only)
CREATE POLICY "candidates_view_own_recruitment_disc"
ON public.candidate_disc_sessions
FOR SELECT TO authenticated
USING (
  candidate_profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  )
  AND job_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.recruitment_jobs rj
    WHERE rj.id = job_id AND rj.status = 'active'
  )
);

-- Candidates can create DISC sessions for recruitment
CREATE POLICY "candidates_insert_own_recruitment_disc"
ON public.candidate_disc_sessions
FOR INSERT TO authenticated
WITH CHECK (
  candidate_profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  )
  AND job_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.recruitment_jobs rj
    WHERE rj.id = job_id AND rj.status = 'active'
  )
);

-- Candidates can update their own recruitment DISC sessions
CREATE POLICY "candidates_update_own_recruitment_disc"
ON public.candidate_disc_sessions
FOR UPDATE TO authenticated
USING (
  candidate_profile_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  )
  AND job_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.recruitment_jobs rj
    WHERE rj.id = job_id AND rj.status = 'active'
  )
);

-- Candidates can insert responses for their own recruitment DISC sessions
CREATE POLICY "candidates_insert_own_disc_responses"
ON public.candidate_disc_responses
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.candidate_disc_sessions cds
    WHERE cds.id = session_id
    AND cds.candidate_profile_id IN (
      SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
    AND cds.job_id IS NOT NULL
  )
);

-- Candidates can view their own DISC results
CREATE POLICY "candidates_view_own_disc_results"
ON public.candidate_disc_results
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.candidate_disc_sessions cds
    WHERE cds.id = session_id
    AND cds.candidate_profile_id IN (
      SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
    AND cds.job_id IS NOT NULL
  )
);

-- Candidates can view their own DISC responses (to check completion)
CREATE POLICY "candidates_view_own_disc_responses"
ON public.candidate_disc_responses
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.candidate_disc_sessions cds
    WHERE cds.id = session_id
    AND cds.candidate_profile_id IN (
      SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
    AND cds.job_id IS NOT NULL
  )
);
