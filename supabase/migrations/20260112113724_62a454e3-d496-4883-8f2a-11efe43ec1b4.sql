
-- Allow anyone to view job descriptions linked to active public jobs
CREATE POLICY "Anyone can view job descriptions of public jobs"
ON public.job_descriptions
FOR SELECT
USING (
  id IN (
    SELECT job_description_id 
    FROM public.recruitment_jobs 
    WHERE status = 'active' 
    AND is_public = true
  )
);
