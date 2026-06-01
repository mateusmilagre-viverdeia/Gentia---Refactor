-- Recruitment message templates (WhatsApp/Email)
CREATE TABLE IF NOT EXISTS public.recruitment_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','whatsapp')),
  message_type text NOT NULL,
  reminder_day int NULL,
  name text NOT NULL,
  subject text NULL,
  body text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recruitment_message_templates_account
  ON public.recruitment_message_templates(account_id);

CREATE INDEX IF NOT EXISTS idx_recruitment_message_templates_lookup
  ON public.recruitment_message_templates(account_id, channel, message_type, reminder_day);

-- Ensure only one default per (account, channel, message_type, reminder_day)
CREATE UNIQUE INDEX IF NOT EXISTS uq_recruitment_message_templates_default
  ON public.recruitment_message_templates(account_id, channel, message_type, reminder_day)
  WHERE is_default = true;

ALTER TABLE public.recruitment_message_templates ENABLE ROW LEVEL SECURITY;

-- RLS: account members can manage templates
DROP POLICY IF EXISTS "Account members can view recruitment message templates" ON public.recruitment_message_templates;
CREATE POLICY "Account members can view recruitment message templates"
ON public.recruitment_message_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.account_members m
    WHERE m.account_id = recruitment_message_templates.account_id
      AND m.user_id = auth.uid()
      AND (m.is_active IS NULL OR m.is_active = true)
  )
);

DROP POLICY IF EXISTS "Account members can insert recruitment message templates" ON public.recruitment_message_templates;
CREATE POLICY "Account members can insert recruitment message templates"
ON public.recruitment_message_templates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.account_members m
    WHERE m.account_id = recruitment_message_templates.account_id
      AND m.user_id = auth.uid()
      AND (m.is_active IS NULL OR m.is_active = true)
  )
);

DROP POLICY IF EXISTS "Account members can update recruitment message templates" ON public.recruitment_message_templates;
CREATE POLICY "Account members can update recruitment message templates"
ON public.recruitment_message_templates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.account_members m
    WHERE m.account_id = recruitment_message_templates.account_id
      AND m.user_id = auth.uid()
      AND (m.is_active IS NULL OR m.is_active = true)
  )
);

DROP POLICY IF EXISTS "Account members can delete recruitment message templates" ON public.recruitment_message_templates;
CREATE POLICY "Account members can delete recruitment message templates"
ON public.recruitment_message_templates
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.account_members m
    WHERE m.account_id = recruitment_message_templates.account_id
      AND m.user_id = auth.uid()
      AND (m.is_active IS NULL OR m.is_active = true)
  )
);
