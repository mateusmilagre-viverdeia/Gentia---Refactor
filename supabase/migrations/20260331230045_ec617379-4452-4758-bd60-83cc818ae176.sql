
-- Policy para candidatos autenticados atualizarem suas próprias respostas
CREATE POLICY "candidates_update_own_disc_responses"
ON public.candidate_disc_responses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM candidate_disc_sessions cds
    WHERE cds.id = candidate_disc_responses.session_id
    AND cds.candidate_profile_id IN (
      SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
    )
    AND cds.job_id IS NOT NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM candidate_disc_sessions cds
    WHERE cds.id = candidate_disc_responses.session_id
    AND cds.candidate_profile_id IN (
      SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
    )
    AND cds.job_id IS NOT NULL
  )
);

-- Policy pública para atualizar respostas de sessões válidas (via token)
CREATE POLICY "Anyone can update responses for valid sessions"
ON public.candidate_disc_responses
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM candidate_disc_sessions cds
    WHERE cds.id = candidate_disc_responses.session_id
    AND cds.status IN ('pending', 'in_progress')
    AND cds.expires_at > now()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM candidate_disc_sessions cds
    WHERE cds.id = candidate_disc_responses.session_id
    AND cds.status IN ('pending', 'in_progress')
    AND cds.expires_at > now()
  )
);
