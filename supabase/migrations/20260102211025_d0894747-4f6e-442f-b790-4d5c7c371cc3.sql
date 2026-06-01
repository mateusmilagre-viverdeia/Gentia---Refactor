-- Add job_description_id to recruitment_jobs for traceability
ALTER TABLE recruitment_jobs 
ADD COLUMN IF NOT EXISTS job_description_id uuid REFERENCES job_descriptions(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recruitment_jobs_job_description_id 
ON recruitment_jobs(job_description_id);

-- Add comment for documentation
COMMENT ON COLUMN recruitment_jobs.job_description_id IS 'Links to the source job description when job is created from JD';