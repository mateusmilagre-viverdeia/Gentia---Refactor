
ALTER TABLE public.culture_interview_sessions
  ADD COLUMN IF NOT EXISTS current_question_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_followup_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conductor_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS conductor_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.technical_interview_sessions
  ADD COLUMN IF NOT EXISTS current_question_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_followup_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conductor_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS conductor_enabled boolean NOT NULL DEFAULT false;
