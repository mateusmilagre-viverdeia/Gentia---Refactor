-- Phase 1: Autonomous hunting columns
ALTER TABLE public.recruitment_hunting_results
  ADD COLUMN IF NOT EXISTS match_reasoning text,
  ADD COLUMN IF NOT EXISTS autonomous boolean NOT NULL DEFAULT false;

ALTER TABLE public.recruitment_hunting_searches
  ADD COLUMN IF NOT EXISTS autonomous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS job_description_snapshot jsonb;

-- Phase 3: Sequence follow-up columns
ALTER TABLE public.recruitment_outreach_campaigns
  ADD COLUMN IF NOT EXISTS sequence_steps jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.recruitment_outreach_conversations
  ADD COLUMN IF NOT EXISTS current_step integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_followup_at timestamptz;

-- Index for the sequence processor cron job
CREATE INDEX IF NOT EXISTS idx_outreach_conversations_next_followup 
  ON public.recruitment_outreach_conversations (next_followup_at) 
  WHERE next_followup_at IS NOT NULL AND status NOT IN ('responded', 'opted_out', 'archived');