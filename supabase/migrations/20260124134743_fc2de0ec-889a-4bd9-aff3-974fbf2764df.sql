-- Add tags and assigned_to columns to recruitment_applications for bulk actions
ALTER TABLE recruitment_applications
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- Add archived status if not exists
COMMENT ON COLUMN recruitment_applications.tags IS 'Array of tags for categorizing candidates';
COMMENT ON COLUMN recruitment_applications.assigned_to IS 'User ID of the assigned evaluator';

-- Create index for tags search
CREATE INDEX IF NOT EXISTS idx_recruitment_applications_tags 
ON recruitment_applications USING GIN(tags);

-- Create index for assigned_to filtering
CREATE INDEX IF NOT EXISTS idx_recruitment_applications_assigned_to 
ON recruitment_applications(assigned_to);
