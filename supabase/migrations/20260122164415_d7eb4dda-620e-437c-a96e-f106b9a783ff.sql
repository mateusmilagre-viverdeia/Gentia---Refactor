-- Add Culture-specific repetition block and rotation state to schedule rules
ALTER TABLE public.pulse_schedule_rules
ADD COLUMN IF NOT EXISTS culture_max_repeat_block_days integer NOT NULL DEFAULT 14,
ADD COLUMN IF NOT EXISTS culture_rotation_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS culture_rotation_next_pillar text NULL;

-- Optional: basic sanity check via constraint (kept simple; no time-based checks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pulse_schedule_rules_culture_max_repeat_block_days_positive'
  ) THEN
    ALTER TABLE public.pulse_schedule_rules
      ADD CONSTRAINT pulse_schedule_rules_culture_max_repeat_block_days_positive
      CHECK (culture_max_repeat_block_days >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pulse_schedule_rules_culture_rotation_next_pillar_valid'
  ) THEN
    ALTER TABLE public.pulse_schedule_rules
      ADD CONSTRAINT pulse_schedule_rules_culture_rotation_next_pillar_valid
      CHECK (
        culture_rotation_next_pillar IS NULL OR
        culture_rotation_next_pillar IN ('mission','vision','decision','indicator','project','energy','development')
      );
  END IF;
END $$;