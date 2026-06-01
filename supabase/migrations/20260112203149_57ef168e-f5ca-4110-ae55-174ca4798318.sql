-- Add new columns for enhanced culture evaluation data
ALTER TABLE public.culture_interview_sessions
ADD COLUMN IF NOT EXISTS aligned_responses JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS misaligned_responses JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS candidate_radar_data JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS company_radar_data JSONB DEFAULT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN public.culture_interview_sessions.aligned_responses IS 'Top 5 responses most aligned with company culture';
COMMENT ON COLUMN public.culture_interview_sessions.misaligned_responses IS 'Top 5 responses least aligned with company culture';
COMMENT ON COLUMN public.culture_interview_sessions.candidate_radar_data IS 'Radar chart data for candidate evaluation across culture pillars';
COMMENT ON COLUMN public.culture_interview_sessions.company_radar_data IS 'Radar chart data for company culture reference (fixed benchmark)';