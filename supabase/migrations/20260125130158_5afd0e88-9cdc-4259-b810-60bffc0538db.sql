-- =====================================================
-- SPRINT R3: PAY-PER-USE BILLING SYSTEM
-- Sistema de créditos para features premium
-- =====================================================

-- Créditos por organização e tipo
CREATE TABLE public.recruitment_usage_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  credit_type TEXT NOT NULL, -- hunting, enrichment, ai_interview, marketplace, outreach
  balance INTEGER NOT NULL DEFAULT 0,
  monthly_included INTEGER NOT NULL DEFAULT 0, -- créditos incluídos no plano
  monthly_used INTEGER NOT NULL DEFAULT 0, -- usados do mensal
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_used INTEGER NOT NULL DEFAULT 0,
  last_purchase_at TIMESTAMPTZ,
  last_reset_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, credit_type),
  CONSTRAINT positive_balance CHECK (balance >= 0)
);

-- Histórico de uso detalhado
CREATE TABLE public.recruitment_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  credit_type TEXT NOT NULL,
  operation TEXT NOT NULL, -- purchase, consume, refund, bonus, monthly_reset
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_id UUID, -- job_id, candidate_id, campaign_id, etc
  reference_type TEXT, -- job, candidate, campaign, hunting_result
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pacotes de créditos disponíveis para compra
CREATE TABLE public.recruitment_credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  credits INTEGER NOT NULL,
  price_cents INTEGER NOT NULL, -- em centavos BRL
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  bonus_percent INTEGER DEFAULT 0, -- ex: 10 = 10% bonus
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tipos de crédito e custos (referência)
CREATE TABLE public.recruitment_credit_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE, -- hunting_search, profile_enrich, ai_interview, etc
  credit_type TEXT NOT NULL,
  credits_per_use INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recruitment_usage_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_credit_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recruitment_usage_credits
CREATE POLICY "Members can view their org credits"
  ON public.recruitment_usage_credits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members
      WHERE account_members.account_id = recruitment_usage_credits.account_id
      AND account_members.user_id = auth.uid()
      AND account_members.is_active = true
    )
  );

-- RLS Policies for recruitment_usage_log
CREATE POLICY "Members can view their org usage log"
  ON public.recruitment_usage_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members
      WHERE account_members.account_id = recruitment_usage_log.account_id
      AND account_members.user_id = auth.uid()
      AND account_members.is_active = true
    )
  );

-- RLS Policies for recruitment_credit_packages (public read)
CREATE POLICY "Anyone can view active packages"
  ON public.recruitment_credit_packages FOR SELECT
  USING (is_active = true);

-- RLS Policies for recruitment_credit_costs (public read)
CREATE POLICY "Anyone can view active costs"
  ON public.recruitment_credit_costs FOR SELECT
  USING (is_active = true);

-- Indexes
CREATE INDEX idx_usage_credits_account ON public.recruitment_usage_credits(account_id);
CREATE INDEX idx_usage_credits_type ON public.recruitment_usage_credits(credit_type);
CREATE INDEX idx_usage_log_account ON public.recruitment_usage_log(account_id);
CREATE INDEX idx_usage_log_created ON public.recruitment_usage_log(created_at DESC);
CREATE INDEX idx_usage_log_reference ON public.recruitment_usage_log(reference_type, reference_id);
CREATE INDEX idx_credit_packages_type ON public.recruitment_credit_packages(credit_type);

-- Trigger for updated_at
CREATE TRIGGER update_recruitment_usage_credits_updated_at
  BEFORE UPDATE ON public.recruitment_usage_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recruitment_credit_packages_updated_at
  BEFORE UPDATE ON public.recruitment_credit_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default credit costs
INSERT INTO public.recruitment_credit_costs (feature_key, credit_type, credits_per_use, description) VALUES
  ('hunting_search', 'hunting', 5, 'Busca de candidatos via Firecrawl'),
  ('profile_enrich', 'enrichment', 3, 'Enriquecimento de perfil via Apollo'),
  ('ai_interview', 'ai_interview', 10, 'Entrevista técnica com IA'),
  ('marketplace_unlock', 'marketplace', 8, 'Desbloquear candidato do marketplace'),
  ('outreach_100', 'outreach', 15, 'Campanha de outreach (100 mensagens)'),
  ('disc_assessment', 'ai_interview', 5, 'Avaliação DISC de candidato');

-- Insert default credit packages
INSERT INTO public.recruitment_credit_packages (credit_type, name, description, credits, price_cents, bonus_percent, is_popular, display_order) VALUES
  -- Hunting
  ('hunting', 'Hunting Starter', '50 buscas de candidatos', 50, 9900, 0, false, 1),
  ('hunting', 'Hunting Pro', '150 buscas + 20% bônus', 180, 24900, 20, true, 2),
  ('hunting', 'Hunting Enterprise', '500 buscas + 30% bônus', 650, 69900, 30, false, 3),
  -- Enrichment
  ('enrichment', 'Enrich Basic', '30 enriquecimentos', 30, 5900, 0, false, 1),
  ('enrichment', 'Enrich Plus', '100 enriquecimentos + 15% bônus', 115, 14900, 15, true, 2),
  ('enrichment', 'Enrich Unlimited', '300 enriquecimentos + 25% bônus', 375, 34900, 25, false, 3),
  -- AI Interview
  ('ai_interview', 'AI Interview Pack', '10 entrevistas IA', 100, 19900, 0, false, 1),
  ('ai_interview', 'AI Interview Pro', '30 entrevistas + 20% bônus', 360, 49900, 20, true, 2),
  -- Outreach
  ('outreach', 'Outreach Starter', '500 mensagens', 75, 14900, 0, false, 1),
  ('outreach', 'Outreach Pro', '2000 mensagens + 25% bônus', 375, 49900, 25, true, 2),
  -- Marketplace
  ('marketplace', 'Marketplace Pack', '20 desbloqueios', 160, 29900, 0, false, 1),
  ('marketplace', 'Marketplace Pro', '50 desbloqueios + 20% bônus', 480, 59900, 20, true, 2);

-- Function to initialize credits for new orgs (called after subscription)
CREATE OR REPLACE FUNCTION public.initialize_org_credits(p_account_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Initialize all credit types with monthly included amounts based on subscription
  INSERT INTO recruitment_usage_credits (account_id, credit_type, balance, monthly_included)
  VALUES 
    (p_account_id, 'hunting', 20, 20),
    (p_account_id, 'enrichment', 10, 10),
    (p_account_id, 'ai_interview', 50, 50),
    (p_account_id, 'outreach', 0, 0),
    (p_account_id, 'marketplace', 0, 0)
  ON CONFLICT (account_id, credit_type) DO NOTHING;
END;
$$;

-- Function to consume credits (atomic)
CREATE OR REPLACE FUNCTION public.consume_credits(
  p_account_id UUID,
  p_credit_type TEXT,
  p_amount INTEGER,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_monthly_used INTEGER;
  v_monthly_included INTEGER;
BEGIN
  -- Lock row for update
  SELECT balance, monthly_used, monthly_included 
  INTO v_current_balance, v_monthly_used, v_monthly_included
  FROM recruitment_usage_credits
  WHERE account_id = p_account_id AND credit_type = p_credit_type
  FOR UPDATE;

  -- Check if record exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_credits_record',
      'message', 'Registro de créditos não encontrado'
    );
  END IF;

  -- Check balance
  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'message', 'Créditos insuficientes',
      'required', p_amount,
      'available', v_current_balance
    );
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance - p_amount;

  -- Update credits
  UPDATE recruitment_usage_credits
  SET 
    balance = v_new_balance,
    monthly_used = monthly_used + p_amount,
    total_used = total_used + p_amount,
    updated_at = now()
  WHERE account_id = p_account_id AND credit_type = p_credit_type;

  -- Log the consumption
  INSERT INTO recruitment_usage_log (
    account_id, credit_type, operation, amount,
    balance_before, balance_after,
    reference_id, reference_type, description, created_by
  ) VALUES (
    p_account_id, p_credit_type, 'consume', p_amount,
    v_current_balance, v_new_balance,
    p_reference_id, p_reference_type, p_description, p_user_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance,
    'consumed', p_amount
  );
END;
$$;

-- Function to add credits (purchase or bonus)
CREATE OR REPLACE FUNCTION public.add_credits(
  p_account_id UUID,
  p_credit_type TEXT,
  p_amount INTEGER,
  p_operation TEXT DEFAULT 'purchase',
  p_description TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Ensure credit record exists
  INSERT INTO recruitment_usage_credits (account_id, credit_type, balance)
  VALUES (p_account_id, p_credit_type, 0)
  ON CONFLICT (account_id, credit_type) DO NOTHING;

  -- Lock and get current balance
  SELECT balance INTO v_current_balance
  FROM recruitment_usage_credits
  WHERE account_id = p_account_id AND credit_type = p_credit_type
  FOR UPDATE;

  v_new_balance := v_current_balance + p_amount;

  -- Update credits
  UPDATE recruitment_usage_credits
  SET 
    balance = v_new_balance,
    total_purchased = CASE WHEN p_operation = 'purchase' THEN total_purchased + p_amount ELSE total_purchased END,
    last_purchase_at = CASE WHEN p_operation = 'purchase' THEN now() ELSE last_purchase_at END,
    updated_at = now()
  WHERE account_id = p_account_id AND credit_type = p_credit_type;

  -- Log the addition
  INSERT INTO recruitment_usage_log (
    account_id, credit_type, operation, amount,
    balance_before, balance_after,
    description, created_by, metadata
  ) VALUES (
    p_account_id, p_credit_type, p_operation, p_amount,
    v_current_balance, v_new_balance,
    p_description, p_user_id, p_metadata
  );

  RETURN jsonb_build_object(
    'success', true,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance,
    'added', p_amount
  );
END;
$$;

-- Function to check credit balance
CREATE OR REPLACE FUNCTION public.check_credits(
  p_account_id UUID,
  p_credit_type TEXT,
  p_required INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
  v_monthly_included INTEGER;
  v_monthly_used INTEGER;
BEGIN
  SELECT balance, monthly_included, monthly_used
  INTO v_balance, v_monthly_included, v_monthly_used
  FROM recruitment_usage_credits
  WHERE account_id = p_account_id AND credit_type = p_credit_type;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_credits', false,
      'balance', 0,
      'required', p_required,
      'monthly_included', 0,
      'monthly_used', 0
    );
  END IF;

  RETURN jsonb_build_object(
    'has_credits', v_balance >= p_required,
    'balance', v_balance,
    'required', p_required,
    'monthly_included', v_monthly_included,
    'monthly_used', v_monthly_used
  );
END;
$$;