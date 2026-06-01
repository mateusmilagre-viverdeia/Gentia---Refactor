-- Add source field to track where candidates come from
ALTER TABLE recruitment_applications 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'careers_page';

-- Add indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_applications_source ON recruitment_applications(source);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON recruitment_applications(applied_at);
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON recruitment_evaluations(created_at);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator_id ON recruitment_evaluations(evaluator_id);

-- Comment for documentation
COMMENT ON COLUMN recruitment_applications.source IS 'Source of the application: careers_page, referral, linkedin, direct, other';