
-- Table to track credit subscription per org
CREATE TABLE public.org_credit_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  package_id UUID REFERENCES public.recruitment_credit_packages(id),
  status TEXT NOT NULL DEFAULT 'active',
  credits_per_period INTEGER NOT NULL,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);

ALTER TABLE public.org_credit_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own org credit subscriptions"
  ON public.org_credit_subscriptions FOR SELECT
  TO authenticated
  USING (public.is_account_member(auth.uid(), org_id));

CREATE POLICY "Service role manages credit subscriptions"
  ON public.org_credit_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.recruitment_credit_packages
  ADD COLUMN IF NOT EXISTS billing_interval TEXT DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS price_per_credit_cents INTEGER DEFAULT 0;

UPDATE public.recruitment_credit_packages SET is_active = false;

INSERT INTO public.recruitment_credit_packages
  (name, description, credit_type, credits, price_cents, bonus_percent, is_popular, display_order, is_active, stripe_price_id, billing_interval, price_per_credit_cents)
VALUES
  ('Pro 1', '50 créditos por mês', 'universal', 50, 9950, 0, false, 1, true, 'price_1TGj5nKV6gEseQSlDmR8nJQG', 'monthly', 199),
  ('Pro 2', '100 créditos por mês', 'universal', 100, 18900, 0, false, 2, true, 'price_1TGj5xKV6gEseQSlea52gE7D', 'monthly', 189),
  ('Pro 3', '200 créditos por mês', 'universal', 200, 35800, 0, true, 3, true, 'price_1TGj5yKV6gEseQSlTp5HvMfZ', 'monthly', 179),
  ('Pro 4', '400 créditos por mês', 'universal', 400, 67600, 0, false, 4, true, 'price_1TGj5zKV6gEseQSlxaEv3Gv7', 'monthly', 169),
  ('Pro 5', '800 créditos por mês', 'universal', 800, 119200, 0, false, 5, true, 'price_1TGj60KV6gEseQSl5f6sg7kn', 'monthly', 149),
  ('Pro 6', '1.600 créditos por mês', 'universal', 1600, 222400, 0, false, 6, true, 'price_1TGj61KV6gEseQSl5RNh9YhQ', 'monthly', 139);
