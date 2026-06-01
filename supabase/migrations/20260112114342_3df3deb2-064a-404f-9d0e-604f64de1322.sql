
-- Allow anyone to view companies that have active public jobs (for public job pages)
CREATE POLICY "Anyone can view companies with public jobs"
ON public.companies
FOR SELECT
USING (
  id IN (
    SELECT account_id 
    FROM public.recruitment_jobs 
    WHERE status = 'active' 
    AND is_public = true
  )
);
