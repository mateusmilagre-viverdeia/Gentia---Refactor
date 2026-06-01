-- ============ hunting_contact_cache ============
CREATE TABLE public.hunting_contact_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  linkedin_url text,
  name_company_hash text,
  email text,
  email_confidence text CHECK (email_confidence IN ('verified','risky','invalid','unknown')),
  email_source text,
  phone text,
  phone_is_whatsapp boolean,
  phone_source text,
  cascade_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_cost_credits numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '180 days')
);

CREATE UNIQUE INDEX hunting_contact_cache_linkedin_idx
  ON public.hunting_contact_cache (account_id, linkedin_url)
  WHERE linkedin_url IS NOT NULL;

CREATE UNIQUE INDEX hunting_contact_cache_namehash_idx
  ON public.hunting_contact_cache (account_id, name_company_hash)
  WHERE name_company_hash IS NOT NULL;

CREATE INDEX hunting_contact_cache_expires_idx
  ON public.hunting_contact_cache (expires_at);

ALTER TABLE public.hunting_contact_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view contact cache"
  ON public.hunting_contact_cache FOR SELECT
  USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

CREATE POLICY "Members can insert contact cache"
  ON public.hunting_contact_cache FOR INSERT
  WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

CREATE POLICY "Members can update contact cache"
  ON public.hunting_contact_cache FOR UPDATE
  USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

CREATE POLICY "Members can delete contact cache"
  ON public.hunting_contact_cache FOR DELETE
  USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- ============ hunting_provider_settings ============
CREATE TABLE public.hunting_provider_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE,
  mode text NOT NULL DEFAULT 'low_cost' CHECK (mode IN ('free_only','low_cost','aggressive')),
  daily_firecrawl_limit integer NOT NULL DEFAULT 100 CHECK (daily_firecrawl_limit >= 0),
  enable_mailboxlayer boolean NOT NULL DEFAULT true,
  enable_hunter boolean NOT NULL DEFAULT false,
  enable_snov boolean NOT NULL DEFAULT false,
  enable_neverbounce boolean NOT NULL DEFAULT false,
  enable_twilio boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hunting_provider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view provider settings"
  ON public.hunting_provider_settings FOR SELECT
  USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

CREATE POLICY "Members can insert provider settings"
  ON public.hunting_provider_settings FOR INSERT
  WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

CREATE POLICY "Members can update provider settings"
  ON public.hunting_provider_settings FOR UPDATE
  USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- ============ hunting_daily_usage (circuit breaker) ============
CREATE TABLE public.hunting_daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  provider text NOT NULL,
  usage_date date NOT NULL DEFAULT current_date,
  count integer NOT NULL DEFAULT 0,
  cost_credits numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, provider, usage_date)
);

CREATE INDEX hunting_daily_usage_lookup_idx
  ON public.hunting_daily_usage (account_id, provider, usage_date);

ALTER TABLE public.hunting_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view daily usage"
  ON public.hunting_daily_usage FOR SELECT
  USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- inserts/updates só via service role (edge functions)

-- ============ Colunas em recruitment_hunting_results ============
ALTER TABLE public.recruitment_hunting_results
  ADD COLUMN IF NOT EXISTS discovery_cascade jsonb,
  ADD COLUMN IF NOT EXISTS discovery_cost_credits numeric NOT NULL DEFAULT 0;

-- ============ Trigger updated_at ============
CREATE OR REPLACE FUNCTION public.touch_hunting_contact_cache()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE TRIGGER hunting_contact_cache_touch
  BEFORE UPDATE ON public.hunting_contact_cache
  FOR EACH ROW EXECUTE FUNCTION public.touch_hunting_contact_cache();

CREATE TRIGGER hunting_provider_settings_touch
  BEFORE UPDATE ON public.hunting_provider_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_hunting_contact_cache();

CREATE TRIGGER hunting_daily_usage_touch
  BEFORE UPDATE ON public.hunting_daily_usage
  FOR EACH ROW EXECUTE FUNCTION public.touch_hunting_contact_cache();