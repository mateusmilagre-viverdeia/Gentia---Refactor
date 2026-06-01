
-- Drop existing restrictive policies and create more inclusive ones

-- For recruitment_jobs: Allow ANY user (authenticated or anon) to view active public jobs
DROP POLICY IF EXISTS "Public can view active jobs" ON public.recruitment_jobs;
DROP POLICY IF EXISTS "Authenticated users can view active public jobs" ON public.recruitment_jobs;

CREATE POLICY "Anyone can view active public jobs"
ON public.recruitment_jobs
FOR SELECT
USING (status = 'active' AND is_public = true);

-- For job_descriptions: Ensure ANY user can view job descriptions linked to public jobs
DROP POLICY IF EXISTS "Anyone can view job descriptions of public jobs" ON public.job_descriptions;

CREATE POLICY "Anyone can view public job descriptions"
ON public.job_descriptions
FOR SELECT
USING (
  id IN (
    SELECT job_description_id 
    FROM public.recruitment_jobs 
    WHERE status = 'active' AND is_public = true AND job_description_id IS NOT NULL
  )
);

-- For companies: Ensure ANY user can view companies with public jobs
DROP POLICY IF EXISTS "Anyone can view companies with public jobs" ON public.companies;

CREATE POLICY "Anyone can view companies with public jobs"
ON public.companies
FOR SELECT
USING (
  id IN (
    SELECT account_id 
    FROM public.recruitment_jobs 
    WHERE status = 'active' AND is_public = true
  )
);
