-- Create hunting outreach personas table
CREATE TABLE public.hunting_outreach_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tone TEXT,
  style_guidelines TEXT,
  example_messages JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hunting_outreach_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their org personas"
  ON public.hunting_outreach_personas FOR SELECT
  TO authenticated
  USING (account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Members can create personas"
  ON public.hunting_outreach_personas FOR INSERT
  TO authenticated
  WITH CHECK (account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Members can update their org personas"
  ON public.hunting_outreach_personas FOR UPDATE
  TO authenticated
  USING (account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Members can delete their org personas"
  ON public.hunting_outreach_personas FOR DELETE
  TO authenticated
  USING (account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true));

-- Add template_used to outreach conversations
ALTER TABLE public.recruitment_outreach_conversations
  ADD COLUMN IF NOT EXISTS template_used TEXT;