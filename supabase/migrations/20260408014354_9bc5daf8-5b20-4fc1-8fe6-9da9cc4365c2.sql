
-- Drop existing check constraint
ALTER TABLE public.recruitment_job_workflow_steps
DROP CONSTRAINT IF EXISTS recruitment_job_workflow_steps_step_type_check;

-- Add updated check constraint including 'screening'
ALTER TABLE public.recruitment_job_workflow_steps
ADD CONSTRAINT recruitment_job_workflow_steps_step_type_check
CHECK (step_type IN ('screening', 'cultural', 'disc', 'technical'));
