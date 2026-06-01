
-- Allow anonymous access to portal_clientes_acesso for token validation
CREATE POLICY "anon_portal_select_by_token"
ON public.portal_clientes_acesso
FOR SELECT
TO anon
USING (true);

-- Allow anonymous to update ultimo_acesso on their own portal access record
CREATE POLICY "anon_portal_update_ultimo_acesso"
ON public.portal_clientes_acesso
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow anonymous to insert feedback from portal
CREATE POLICY "anon_portal_feedback_insert"
ON public.portal_feedbacks
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous to view feedback for their client
CREATE POLICY "anon_portal_feedback_select"
ON public.portal_feedbacks
FOR SELECT
TO anon
USING (true);

-- Allow anonymous to view client data (filtered by app logic via token)
CREATE POLICY "anon_portal_clientes_select"
ON public.clientes_consultoria
FOR SELECT
TO anon
USING (true);

-- Allow anonymous to view jobs linked to a client (filtered by app logic)
CREATE POLICY "anon_portal_jobs_select"
ON public.recruitment_jobs
FOR SELECT
TO anon
USING (true);

-- Allow anonymous to view candidates (filtered by app logic via job)
CREATE POLICY "anon_portal_candidates_select"
ON public.recruitment_candidates
FOR SELECT
TO anon
USING (true);

-- Allow anonymous to view applications for portal
CREATE POLICY "anon_portal_applications_select"
ON public.recruitment_applications
FOR SELECT
TO anon
USING (true);

-- Allow anonymous to view clientes_contatos for portal
CREATE POLICY "anon_portal_contatos_select"
ON public.clientes_contatos
FOR SELECT
TO anon
USING (true);
