-- Add funnel_id to recruitment_jobs to link jobs to hiring funnels
ALTER TABLE public.recruitment_jobs 
ADD COLUMN funnel_id uuid REFERENCES public.hiring_funnels(id);

-- Add stage_id to recruitment_applications to track current funnel stage
ALTER TABLE public.recruitment_applications 
ADD COLUMN stage_id uuid REFERENCES public.hiring_funnel_stages(id);

-- Create index for better query performance
CREATE INDEX idx_recruitment_jobs_funnel_id ON public.recruitment_jobs(funnel_id);
CREATE INDEX idx_recruitment_applications_stage_id ON public.recruitment_applications(stage_id);

-- Add comment for documentation
COMMENT ON COLUMN public.recruitment_jobs.funnel_id IS 'Reference to the hiring funnel used for this job';
COMMENT ON COLUMN public.recruitment_applications.stage_id IS 'Current stage in the hiring funnel for this application';