-- Add questionnaire_version and segment columns to mission_sessions
ALTER TABLE mission_sessions 
ADD COLUMN IF NOT EXISTS questionnaire_version INTEGER DEFAULT 1;

ALTER TABLE mission_sessions 
ADD COLUMN IF NOT EXISTS segment TEXT CHECK (segment IN ('industry', 'services', 'product'));

-- Comment on columns
COMMENT ON COLUMN mission_sessions.questionnaire_version IS 'Version 1 = 8 questions (legacy), Version 2 = 10 questions (Golden Circle)';
COMMENT ON COLUMN mission_sessions.segment IS 'Business segment for Q4 context: industry, services, or product';