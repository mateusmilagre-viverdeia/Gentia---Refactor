-- Allow authenticated candidates to read workflow steps for active jobs
CREATE POLICY "rjws_select_candidates"
ON public.recruitment_job_workflow_steps
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.recruitment_jobs rj
    WHERE rj.id = job_id
    AND rj.status = 'active'
  )
);