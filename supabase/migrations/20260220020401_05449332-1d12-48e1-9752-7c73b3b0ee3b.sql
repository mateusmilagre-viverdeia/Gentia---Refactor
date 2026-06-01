ALTER TABLE public.platform_email_config
  ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
  ADD COLUMN IF NOT EXISTS resend_endpoint TEXT DEFAULT 'https://api.resend.com/emails';