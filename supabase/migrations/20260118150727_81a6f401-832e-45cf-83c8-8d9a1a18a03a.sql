-- Add related_user_id column to pulse_alerts for individual member alerts
ALTER TABLE pulse_alerts 
ADD COLUMN IF NOT EXISTS related_user_id uuid REFERENCES auth.users(id);

COMMENT ON COLUMN pulse_alerts.related_user_id IS 'User related to alert (for individual member alerts)';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_pulse_alerts_related_user 
ON pulse_alerts(related_user_id) WHERE related_user_id IS NOT NULL;

-- Create pulse_culture_metrics_daily table for aggregated culture metrics
CREATE TABLE IF NOT EXISTS pulse_culture_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date date NOT NULL,
  overall_score numeric NOT NULL DEFAULT 0,
  by_pillar jsonb NOT NULL DEFAULT '{}',
  by_value jsonb NOT NULL DEFAULT '{}',
  response_count integer NOT NULL DEFAULT 0,
  respondent_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(account_id, date)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_culture_metrics_account_date 
ON pulse_culture_metrics_daily(account_id, date DESC);

-- Enable RLS
ALTER TABLE pulse_culture_metrics_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own account's culture metrics
CREATE POLICY "Users can read own account culture metrics"
  ON pulse_culture_metrics_daily FOR SELECT
  USING (account_id IN (
    SELECT account_id FROM account_members 
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- Trigger for updated_at
CREATE TRIGGER update_culture_metrics_updated_at
  BEFORE UPDATE ON pulse_culture_metrics_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();