
CREATE TABLE public.market_research_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_account_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  job_title text NOT NULL,
  seniority text NOT NULL,
  area text,
  industry text,
  location jsonb NOT NULL DEFAULT '{}',
  competitors jsonb NOT NULL DEFAULT '[]',
  reference_urls jsonb NOT NULL DEFAULT '[]',
  required_skills jsonb NOT NULL DEFAULT '[]',
  briefing_notes text,
  branding jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  executive_summary jsonb,
  compensation_block jsonb,
  talent_intelligence_block jsonb,
  competitive_block jsonb,
  diagnosis_block jsonb,
  citations jsonb NOT NULL DEFAULT '[]',
  models_used jsonb NOT NULL DEFAULT '{}',
  prompt_versions jsonb NOT NULL DEFAULT '{}',
  public_slug text UNIQUE,
  public_password_hash text,
  expires_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  credits_consumed numeric NOT NULL DEFAULT 0,
  ai_executions jsonb NOT NULL DEFAULT '[]',
  generation_started_at timestamptz,
  generation_completed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mrr_account ON public.market_research_reports(account_id);
CREATE INDEX idx_mrr_status ON public.market_research_reports(status);
CREATE INDEX idx_mrr_slug ON public.market_research_reports(public_slug) WHERE public_slug IS NOT NULL;

ALTER TABLE public.market_research_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mrr_select_members" ON public.market_research_reports
FOR SELECT USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "mrr_insert_members" ON public.market_research_reports
FOR INSERT WITH CHECK (public.is_account_member(auth.uid(), account_id) AND created_by = auth.uid());

CREATE POLICY "mrr_update_members" ON public.market_research_reports
FOR UPDATE USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "mrr_delete_members" ON public.market_research_reports
FOR DELETE USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "mrr_public_slug_read" ON public.market_research_reports
FOR SELECT TO anon USING (
  public_slug IS NOT NULL AND status = 'ready'
  AND (expires_at IS NULL OR expires_at > now())
);

CREATE TRIGGER update_mrr_updated_at
BEFORE UPDATE ON public.market_research_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.market_research_model_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_name text UNIQUE NOT NULL,
  provider text NOT NULL,
  model_id text NOT NULL,
  fallback_model_id text,
  max_tokens integer NOT NULL DEFAULT 4096,
  temperature numeric NOT NULL DEFAULT 0.3,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.market_research_model_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mrmc_read_auth" ON public.market_research_model_config
FOR SELECT TO authenticated USING (true);

CREATE POLICY "mrmc_admin_write" ON public.market_research_model_config
FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE public.market_research_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_name text NOT NULL,
  version integer NOT NULL,
  system_prompt text NOT NULL,
  tool_schema jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (block_name, version)
);

CREATE INDEX idx_mrp_active ON public.market_research_prompts(block_name, is_active);

ALTER TABLE public.market_research_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mrp_read_auth" ON public.market_research_prompts
FOR SELECT TO authenticated USING (true);

CREATE POLICY "mrp_admin_write" ON public.market_research_prompts
FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.market_research_model_config (block_name, provider, model_id, fallback_model_id, max_tokens, temperature) VALUES
  ('compensation', 'anthropic', 'claude-sonnet-4-5', 'claude-sonnet-4-5', 8000, 0.3),
  ('talent_intelligence', 'anthropic', 'claude-sonnet-4-5', 'claude-sonnet-4-5', 6000, 0.3),
  ('competitive', 'anthropic', 'claude-sonnet-4-5', 'claude-sonnet-4-5', 6000, 0.3),
  ('diagnosis', 'anthropic', 'claude-opus-4', 'claude-sonnet-4-5', 6000, 0.4),
  ('executive_summary', 'lovable_ai', 'google/gemini-2.5-flash', NULL, 1500, 0.3),
  ('validation', 'lovable_ai', 'openai/gpt-5-mini', NULL, 2000, 0.2),
  ('scrape_extraction', 'lovable_ai', 'google/gemini-2.5-flash', NULL, 4000, 0.2);
