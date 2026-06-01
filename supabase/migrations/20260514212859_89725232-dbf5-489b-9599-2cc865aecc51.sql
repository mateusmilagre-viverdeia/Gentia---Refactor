
ALTER TABLE public.technical_interview_responses
  ADD COLUMN IF NOT EXISTS max_level_reached smallint,
  ADD COLUMN IF NOT EXISTS max_level_passed smallint,
  ADD COLUMN IF NOT EXISTS ceiling_detected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ceiling_signal text,
  ADD COLUMN IF NOT EXISTS seniority_assessed text,
  ADD COLUMN IF NOT EXISTS evidence_count smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scenario_handled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS keyword_coverage numeric;

ALTER TABLE public.technical_interview_sessions
  ADD COLUMN IF NOT EXISTS evaluation_version text DEFAULT 'v2',
  ADD COLUMN IF NOT EXISTS evaluation_audit_trail jsonb,
  ADD COLUMN IF NOT EXISTS seniority_target text DEFAULT 'pleno';
