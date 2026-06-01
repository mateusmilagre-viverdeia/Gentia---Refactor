-- Add email notification options for all notification types
ALTER TABLE recruitment_notification_settings
ADD COLUMN IF NOT EXISTS notify_new_applications_email BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notify_pending_evaluations_email BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notify_interview_reminders_email BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notify_stale_jobs_email BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notify_stale_candidates_email BOOLEAN DEFAULT false;

-- Add frequency and scheduling options
ALTER TABLE recruitment_notification_settings
ADD COLUMN IF NOT EXISTS digest_mode TEXT DEFAULT 'realtime' CHECK (digest_mode IN ('realtime', 'daily', 'weekly')),
ADD COLUMN IF NOT EXISTS preferred_hour INTEGER DEFAULT 9 CHECK (preferred_hour >= 0 AND preferred_hour <= 23),
ADD COLUMN IF NOT EXISTS digest_day INTEGER DEFAULT 1 CHECK (digest_day >= 0 AND digest_day <= 6);

-- Add comment for clarity
COMMENT ON COLUMN recruitment_notification_settings.digest_mode IS 'realtime = instant notifications, daily = daily digest, weekly = weekly digest';
COMMENT ON COLUMN recruitment_notification_settings.preferred_hour IS 'Hour of day (0-23) for digest delivery';
COMMENT ON COLUMN recruitment_notification_settings.digest_day IS 'Day of week for weekly digest (0=Sunday, 1=Monday, etc)';