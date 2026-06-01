-- Add period tracking fields to roip_assessments
ALTER TABLE roip_assessments 
ADD COLUMN IF NOT EXISTS period_month INTEGER,
ADD COLUMN IF NOT EXISTS period_year INTEGER;

-- Create index for period queries
CREATE INDEX IF NOT EXISTS idx_roip_assessments_period 
ON roip_assessments(user_id, period_year DESC, period_month DESC);

-- Update existing records with period based on created_at
UPDATE roip_assessments 
SET 
  period_month = EXTRACT(MONTH FROM created_at)::INTEGER,
  period_year = EXTRACT(YEAR FROM created_at)::INTEGER
WHERE period_month IS NULL OR period_year IS NULL;