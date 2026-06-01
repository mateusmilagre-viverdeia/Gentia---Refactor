ALTER TABLE public.platform_email_config
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'resend',
  ADD COLUMN IF NOT EXISTS smtp_host TEXT,
  ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587,
  ADD COLUMN IF NOT EXISTS smtp_user TEXT,
  ADD COLUMN IF NOT EXISTS smtp_password TEXT,
  ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.platform_email_config.provider IS 'resend | smtp';
COMMENT ON COLUMN public.platform_email_config.smtp_password IS 'SMTP password - never returned via API, only smtp_has_password flag';
