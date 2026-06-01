-- Add recurrence fields to surveys table
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMPTZ;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS parent_survey_id UUID REFERENCES surveys(id);
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS recurrence_count INTEGER DEFAULT 0;

-- Add reminder fields to surveys table
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER[] DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS reminder_sent_dates TIMESTAMPTZ[] DEFAULT ARRAY[]::TIMESTAMPTZ[];

-- Create survey_schedules table for future scheduled instances
CREATE TABLE IF NOT EXISTS survey_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  scheduled_start_date TIMESTAMPTZ NOT NULL,
  scheduled_end_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'cancelled')),
  created_survey_id UUID REFERENCES surveys(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on survey_schedules
ALTER TABLE survey_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for survey_schedules
CREATE POLICY "Users can view schedules for their account surveys"
  ON survey_schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM surveys s
      WHERE s.id = survey_schedules.survey_id
      AND is_account_member(auth.uid(), s.account_id)
    )
  );

CREATE POLICY "Users can create schedules for their account surveys"
  ON survey_schedules
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM surveys s
      WHERE s.id = survey_schedules.survey_id
      AND is_account_member(auth.uid(), s.account_id)
    )
  );

CREATE POLICY "Users can update schedules for their account surveys"
  ON survey_schedules
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM surveys s
      WHERE s.id = survey_schedules.survey_id
      AND is_account_member(auth.uid(), s.account_id)
    )
  );

CREATE POLICY "Users can delete schedules for their account surveys"
  ON survey_schedules
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM surveys s
      WHERE s.id = survey_schedules.survey_id
      AND is_account_member(auth.uid(), s.account_id)
    )
  );

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_survey_schedules_survey_id ON survey_schedules(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_schedules_status ON survey_schedules(status);
CREATE INDEX IF NOT EXISTS idx_survey_schedules_scheduled_start ON survey_schedules(scheduled_start_date);
CREATE INDEX IF NOT EXISTS idx_surveys_is_recurring ON surveys(is_recurring) WHERE is_recurring = TRUE;
CREATE INDEX IF NOT EXISTS idx_surveys_parent_survey ON surveys(parent_survey_id) WHERE parent_survey_id IS NOT NULL;