ALTER TABLE public.account_onboarding_progress
  ADD COLUMN IF NOT EXISTS step_team_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS step_pipeline_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS step_careers_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS step_credits_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS step_comms_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS step_culture_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS step_distribution_done boolean NOT NULL DEFAULT false;