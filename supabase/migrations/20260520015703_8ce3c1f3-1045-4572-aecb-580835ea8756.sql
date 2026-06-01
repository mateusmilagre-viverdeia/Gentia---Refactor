
CREATE OR REPLACE FUNCTION public.consume_credits(
  p_account_id uuid,
  p_credit_type text,
  p_amount numeric,
  p_reference_id uuid DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC(10,1);
  v_new_balance NUMERIC(10,1);
  v_overdraft_limit CONSTANT NUMERIC(10,1) := -5.0;
BEGIN
  SELECT balance
  INTO v_current_balance
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

  v_new_balance := v_current_balance - p_amount;

  -- Permite overdraft até -5 créditos; bloqueia se o débito jogaria abaixo disso
  IF v_new_balance < v_overdraft_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'message', 'Créditos insuficientes (limite de overdraft -5 atingido)',
      'required', p_amount,
      'available', v_current_balance,
      'overdraft_limit', v_overdraft_limit
    );
  END IF;

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
    'consumed', p_amount,
    'overdraft', v_new_balance < 0
  );
END;
$$;
