-- Add tracking columns to recruitment_applications
ALTER TABLE recruitment_applications
ADD COLUMN IF NOT EXISTS medium TEXT,
ADD COLUMN IF NOT EXISTS campaign TEXT,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
ADD COLUMN IF NOT EXISTS utm_term TEXT,
ADD COLUMN IF NOT EXISTS utm_content TEXT,
ADD COLUMN IF NOT EXISTS referrer_url TEXT,
ADD COLUMN IF NOT EXISTS landing_page TEXT;

-- Create indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_applications_source ON recruitment_applications(source);
CREATE INDEX IF NOT EXISTS idx_applications_utm_source ON recruitment_applications(utm_source);
CREATE INDEX IF NOT EXISTS idx_applications_medium ON recruitment_applications(medium);
CREATE INDEX IF NOT EXISTS idx_applications_campaign ON recruitment_applications(campaign);