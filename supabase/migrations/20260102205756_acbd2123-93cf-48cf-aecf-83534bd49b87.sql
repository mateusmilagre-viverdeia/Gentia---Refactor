-- Add recruitment_candidate_id to onboarding_processes for traceability
ALTER TABLE onboarding_processes 
ADD COLUMN IF NOT EXISTS recruitment_candidate_id uuid REFERENCES recruitment_candidates(id);

-- Add job_description_id to onboarding_processes if not exists
ALTER TABLE onboarding_processes 
ADD COLUMN IF NOT EXISTS job_description_id uuid REFERENCES job_descriptions(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_processes_recruitment_candidate 
ON onboarding_processes(recruitment_candidate_id) 
WHERE recruitment_candidate_id IS NOT NULL;