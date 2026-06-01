
-- Allow any authenticated user to view active public jobs (for candidates viewing job pages)
CREATE POLICY "Authenticated users can view active public jobs"
ON public.recruitment_jobs
FOR SELECT
TO authenticated
USING (status = 'active' AND is_public = true);
