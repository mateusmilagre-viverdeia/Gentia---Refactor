-- Add email tracking fields to culture_interview_sessions
ALTER TABLE culture_interview_sessions
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_resend_count INTEGER DEFAULT 0;

-- Create email log table for tracking sent emails
CREATE TABLE IF NOT EXISTS recruitment_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES recruitment_candidates(id) ON DELETE SET NULL,
  session_id UUID REFERENCES culture_interview_sessions(id) ON DELETE SET NULL,
  job_id UUID REFERENCES recruitment_jobs(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL, -- 'interview_invite', 'reminder', 'feedback', 'resend'
  sent_to TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'failed'
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE recruitment_email_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own account email logs"
  ON recruitment_email_log
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert email logs for own account"
  ON recruitment_email_log
  FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_log_account ON recruitment_email_log(account_id);
CREATE INDEX IF NOT EXISTS idx_email_log_session ON recruitment_email_log(session_id);
CREATE INDEX IF NOT EXISTS idx_email_log_candidate ON recruitment_email_log(candidate_id);