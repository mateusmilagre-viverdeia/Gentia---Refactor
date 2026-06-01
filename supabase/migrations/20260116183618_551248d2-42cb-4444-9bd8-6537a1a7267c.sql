-- Add candidate_id and agent_id to culture_interview_sessions for direct references
ALTER TABLE culture_interview_sessions
ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES recruitment_candidates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES recruitment_agents(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_culture_sessions_candidate ON culture_interview_sessions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_culture_sessions_agent ON culture_interview_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_culture_sessions_job ON culture_interview_sessions(job_id);