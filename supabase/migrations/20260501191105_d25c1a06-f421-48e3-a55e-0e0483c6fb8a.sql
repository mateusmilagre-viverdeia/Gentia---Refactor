-- Add channel support to outreach tables (whatsapp default, email new)

-- Conversations: add channel + reply_token for email matching
ALTER TABLE public.recruitment_outreach_conversations
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS reply_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS candidate_email TEXT;

ALTER TABLE public.recruitment_outreach_conversations
  ADD CONSTRAINT outreach_conversations_channel_check
  CHECK (channel IN ('whatsapp','email'));

CREATE INDEX IF NOT EXISTS idx_outreach_conversations_reply_token
  ON public.recruitment_outreach_conversations(reply_token)
  WHERE reply_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outreach_conversations_candidate_email
  ON public.recruitment_outreach_conversations(candidate_email)
  WHERE candidate_email IS NOT NULL;

-- Campaigns: add channel + email-specific template fields
ALTER TABLE public.recruitment_outreach_campaigns
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS from_email TEXT,
  ADD COLUMN IF NOT EXISTS from_name TEXT,
  ADD COLUMN IF NOT EXISTS subject_template TEXT,
  ADD COLUMN IF NOT EXISTS body_html_template TEXT;

ALTER TABLE public.recruitment_outreach_campaigns
  ADD CONSTRAINT outreach_campaigns_channel_check
  CHECK (channel IN ('whatsapp','email'));

-- Queue: add channel for routing
ALTER TABLE public.recruitment_outreach_queue
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp';

ALTER TABLE public.recruitment_outreach_queue
  ADD CONSTRAINT outreach_queue_channel_check
  CHECK (channel IN ('whatsapp','email'));

CREATE INDEX IF NOT EXISTS idx_outreach_queue_channel_status
  ON public.recruitment_outreach_queue(channel, status);

-- Helper function to generate unique reply tokens (used by send-outreach-email)
CREATE OR REPLACE FUNCTION public.generate_outreach_reply_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- 16 bytes -> 32 hex chars, URL-safe
    new_token := encode(gen_random_bytes(16), 'hex');
    SELECT EXISTS(
      SELECT 1 FROM public.recruitment_outreach_conversations
      WHERE reply_token = new_token
    ) INTO token_exists;
    EXIT WHEN NOT token_exists;
  END LOOP;
  RETURN new_token;
END;
$$;