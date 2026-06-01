-- Add notification settings for Final Evaluation alerts
ALTER TABLE recruitment_notification_settings
ADD COLUMN IF NOT EXISTS notify_final_evaluation BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_final_evaluation_email BOOLEAN DEFAULT false;