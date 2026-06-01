-- Add time_reference and slot_category to pulse_questions
ALTER TABLE public.pulse_questions 
ADD COLUMN IF NOT EXISTS time_reference text DEFAULT 'yesterday' CHECK (time_reference IN ('today', 'yesterday', 'structural')),
ADD COLUMN IF NOT EXISTS slot_category text DEFAULT 'rotation' CHECK (slot_category IN ('slot_a', 'slot_b', 'slot_c', 'rotation')),
ADD COLUMN IF NOT EXISTS weight integer DEFAULT 1;

-- Add new scheduling columns to pulse_schedule_rules
ALTER TABLE public.pulse_schedule_rules
ADD COLUMN IF NOT EXISTS weekly_driver_targets jsonb DEFAULT '{
  "mood_energy": 3,
  "company_direction": 2,
  "workload": 2,
  "work_environment": 2,
  "professional_growth": 2,
  "team_relationship": 2,
  "autonomy": 2,
  "clarity_expectations": 2,
  "purpose": 2,
  "recognition": 1,
  "leader_relationship": 2,
  "culture_values": 3
}'::jsonb,
ADD COLUMN IF NOT EXISTS slot_a_driver_keys jsonb DEFAULT '["mood_energy", "clarity_expectations", "autonomy", "purpose", "company_direction"]'::jsonb,
ADD COLUMN IF NOT EXISTS slot_b_driver_keys jsonb DEFAULT '["workload", "work_environment", "team_relationship", "leader_relationship", "recognition", "culture_values", "professional_growth"]'::jsonb,
ADD COLUMN IF NOT EXISTS slot_c_driver_keys jsonb DEFAULT '["culture_values", "purpose", "company_direction"]'::jsonb;

-- Create weekly driver counts table for tracking usage
CREATE TABLE IF NOT EXISTS public.pulse_weekly_driver_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  week_start date NOT NULL,
  driver_key text NOT NULL,
  usage_count integer DEFAULT 0,
  target_count integer DEFAULT 2,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(account_id, week_start, driver_key)
);

-- Enable RLS on weekly driver counts
ALTER TABLE public.pulse_weekly_driver_counts ENABLE ROW LEVEL SECURITY;

-- RLS policies for weekly driver counts
CREATE POLICY "Pulse admins can manage weekly driver counts"
ON public.pulse_weekly_driver_counts
FOR ALL
USING (is_pulse_admin(auth.uid(), account_id))
WITH CHECK (is_pulse_admin(auth.uid(), account_id));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pulse_weekly_driver_counts_account_week 
ON public.pulse_weekly_driver_counts(account_id, week_start);

CREATE INDEX IF NOT EXISTS idx_pulse_questions_time_reference 
ON public.pulse_questions(time_reference);

CREATE INDEX IF NOT EXISTS idx_pulse_questions_slot_category 
ON public.pulse_questions(slot_category);