
-- =============================================
-- 1. Create platform_credit_config table
-- =============================================
CREATE TABLE IF NOT EXISTS public.platform_credit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usd_to_brl NUMERIC(10,2) NOT NULL DEFAULT 5.65,
  margin_percent NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  credit_value_brl NUMERIC(10,2) NOT NULL DEFAULT 1.39,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default config row
INSERT INTO public.platform_credit_config (usd_to_brl, margin_percent, credit_value_brl)
VALUES (5.65, 50.00, 1.39);

-- RLS: only service_role can read/write (edge functions use service_role)
ALTER TABLE public.platform_credit_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.platform_credit_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow authenticated users to read (for admin UI)
CREATE POLICY "Authenticated can read config" ON public.platform_credit_config
  FOR SELECT TO authenticated USING (true);

-- =============================================
-- 2. Alter recruitment_usage_credits: INTEGER → NUMERIC(10,1)
-- =============================================
ALTER TABLE public.recruitment_usage_credits
  ALTER COLUMN balance TYPE NUMERIC(10,1) USING balance::NUMERIC(10,1),
  ALTER COLUMN monthly_included TYPE NUMERIC(10,1) USING monthly_included::NUMERIC(10,1),
  ALTER COLUMN monthly_used TYPE NUMERIC(10,1) USING monthly_used::NUMERIC(10,1),
  ALTER COLUMN total_purchased TYPE NUMERIC(10,1) USING total_purchased::NUMERIC(10,1),
  ALTER COLUMN total_used TYPE NUMERIC(10,1) USING total_used::NUMERIC(10,1);

-- =============================================
-- 3. Alter recruitment_usage_log: INTEGER → NUMERIC(10,1)
-- =============================================
ALTER TABLE public.recruitment_usage_log
  ALTER COLUMN amount TYPE NUMERIC(10,1) USING amount::NUMERIC(10,1),
  ALTER COLUMN balance_before TYPE NUMERIC(10,1) USING balance_before::NUMERIC(10,1),
  ALTER COLUMN balance_after TYPE NUMERIC(10,1) USING balance_after::NUMERIC(10,1);

-- =============================================
-- 4. Recreate consume_credits with NUMERIC types
-- =============================================
CREATE OR REPLACE FUNCTION public.consume_credits(
  p_account_id UUID,
  p_credit_type TEXT,
  p_amount NUMERIC(10,1),
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
  v_current_balance NUMERIC(10,1);
  v_new_balance NUMERIC(10,1);
  v_monthly_used NUMERIC(10,1);
  v_monthly_included NUMERIC(10,1);
BEGIN
  SELECT balance, monthly_used, monthly_included 
  INTO v_current_balance, v_monthly_used, v_monthly_included
  FROM recruitment_usage_credits
  WHERE account_id = p_account_id AND credit_type = p_credit_type
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_credits_record',
      'message', 'Registro de créditos não encontrado'
    );
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'message', 'Créditos insuficientes',
      'required', p_amount,
      'available', v_current_balance
    );
  END IF;

  v_new_balance := v_current_balance - p_amount;

  UPDATE recruitment_usage_credits
  SET 
    balance = v_new_balance,
    monthly_used = monthly_used + p_amount,
    total_used = total_used + p_amount,
    updated_at = now()
  WHERE account_id = p_account_id AND credit_type = p_credit_type;

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

-- =============================================
-- 5. Recreate add_credits with NUMERIC types
-- =============================================
CREATE OR REPLACE FUNCTION public.add_credits(
  p_account_id UUID,
  p_credit_type TEXT,
  p_amount NUMERIC(10,1),
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
  v_current_balance NUMERIC(10,1);
  v_new_balance NUMERIC(10,1);
BEGIN
  INSERT INTO recruitment_usage_credits (account_id, credit_type, balance)
  VALUES (p_account_id, p_credit_type, 0)
  ON CONFLICT (account_id, credit_type) DO NOTHING;

  SELECT balance INTO v_current_balance
  FROM recruitment_usage_credits
  WHERE account_id = p_account_id AND credit_type = p_credit_type
  FOR UPDATE;

  v_new_balance := v_current_balance + p_amount;

  UPDATE recruitment_usage_credits
  SET 
    balance = v_new_balance,
    total_purchased = CASE WHEN p_operation = 'purchase' THEN total_purchased + p_amount ELSE total_purchased END,
    last_purchase_at = CASE WHEN p_operation = 'purchase' THEN now() ELSE last_purchase_at END,
    updated_at = now()
  WHERE account_id = p_account_id AND credit_type = p_credit_type;

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

-- =============================================
-- 6. Recreate check_credits with NUMERIC types
-- =============================================
CREATE OR REPLACE FUNCTION public.check_credits(
  p_account_id UUID,
  p_credit_type TEXT,
  p_required NUMERIC(10,1) DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC(10,1);
  v_monthly_included NUMERIC(10,1);
  v_monthly_used NUMERIC(10,1);
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
