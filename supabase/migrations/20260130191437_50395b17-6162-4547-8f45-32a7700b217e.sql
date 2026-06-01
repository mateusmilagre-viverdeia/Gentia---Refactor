-- Add settings column to recruitment_agents for storing agent-specific configurations
ALTER TABLE public.recruitment_agents
ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.recruitment_agents.settings IS 'Agent-specific settings like maxQuestionsPerSkill, maxFollowUpDepth, maxDurationMinutes for technical agents';