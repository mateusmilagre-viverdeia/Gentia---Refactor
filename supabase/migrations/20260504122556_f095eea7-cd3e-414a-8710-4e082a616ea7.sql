ALTER TABLE public.recruitment_outreach_conversations
  ADD COLUMN IF NOT EXISTS unread_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_unread_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_outreach_conversations_unread
  ON public.recruitment_outreach_conversations(account_id, last_unread_at DESC)
  WHERE unread_count > 0;