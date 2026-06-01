-- AI BILLING SAFETY NET (retry com assinaturas corretas)

CREATE TABLE IF NOT EXISTS public.ai_billing_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  session_id UUID,
  session_type TEXT,
  reference_type TEXT,
  original_log_id UUID,
  billed_credits NUMERIC NOT NULL,
  billed_minutes NUMERIC,
  real_minutes NUMERIC,
  ratio NUMERIC,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'detected'
    CHECK (status IN ('detected','auto_refunded','manual_review','dismissed','blocked_by_fuse')),
  auto_refund_amount NUMERIC,
  refund_log_id UUID,
  detection_source TEXT,
  notes JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_aba_account_detected ON public.ai_billing_anomalies (account_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_aba_status ON public.ai_billing_anomalies (status, severity);
CREATE INDEX IF NOT EXISTS idx_aba_session ON public.ai_billing_anomalies (session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_aba_original_log_unique ON public.ai_billing_anomalies (original_log_id) WHERE original_log_id IS NOT NULL;

ALTER TABLE public.ai_billing_anomalies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage all anomalies" ON public.ai_billing_anomalies;
CREATE POLICY "Super admins manage all anomalies"
  ON public.ai_billing_anomalies FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Account members view own anomalies" ON public.ai_billing_anomalies;
CREATE POLICY "Account members view own anomalies"
  ON public.ai_billing_anomalies FOR SELECT
  USING (public.is_account_member(auth.uid(), account_id));

-- 2) refund_credits
CREATE OR REPLACE FUNCTION public.refund_credits(
  p_account_id UUID,
  p_credit_type TEXT,
  p_amount NUMERIC,
  p_reference_id UUID,
  p_reference_type TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_log_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'amount must be positive');
  END IF;

  INSERT INTO public.recruitment_usage_credits (account_id, credit_type, balance)
  VALUES (p_account_id, p_credit_type, 0)
  ON CONFLICT (account_id, credit_type) DO NOTHING;

  SELECT balance INTO v_balance_before
    FROM public.recruitment_usage_credits
   WHERE account_id = p_account_id AND credit_type = p_credit_type
   FOR UPDATE;

  v_balance_after := COALESCE(v_balance_before, 0) + p_amount;

  UPDATE public.recruitment_usage_credits
     SET balance = v_balance_after,
         total_used = GREATEST(COALESCE(total_used,0) - p_amount, 0),
         monthly_used = GREATEST(COALESCE(monthly_used,0) - p_amount, 0),
         updated_at = now()
   WHERE account_id = p_account_id AND credit_type = p_credit_type;

  INSERT INTO public.recruitment_usage_log (
    account_id, credit_type, operation, amount,
    balance_before, balance_after,
    reference_id, reference_type, description, metadata, created_by
  ) VALUES (
    p_account_id, p_credit_type, 'refund', p_amount,
    v_balance_before, v_balance_after,
    p_reference_id, p_reference_type, p_description, p_metadata, NULL
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'refunded', p_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.refund_credits(uuid, text, numeric, uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid, text, numeric, uuid, text, text, jsonb) TO authenticated, service_role;

-- 3) FUSE trigger
CREATE OR REPLACE FUNCTION public.ai_billing_fuse_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_minutes INT;
  v_match TEXT[];
BEGIN
  IF NEW.operation IS DISTINCT FROM 'consume' THEN
    RETURN NEW;
  END IF;

  IF NEW.reference_type IS NULL OR NEW.reference_type NOT IN (
    'culture_interview','culture_interview_realtime','culture_interview_realtime_watchdog','culture_interview_evaluation',
    'technical_interview','technical_interview_realtime','technical_interview_realtime_watchdog','technical_interview_evaluation',
    'disc_assessment','disc_assessment_evaluation'
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.amount IS NOT NULL AND NEW.amount > 100 THEN
    INSERT INTO public.ai_billing_anomalies (
      account_id, session_id, reference_type, original_log_id,
      billed_credits, severity, status, detection_source, notes
    ) VALUES (
      NEW.account_id, NEW.reference_id, NEW.reference_type, NULL,
      NEW.amount, 'critical', 'blocked_by_fuse', 'fuse_trigger',
      jsonb_build_object('reason','amount_over_cap','attempted_amount',NEW.amount,'description',NEW.description)
    );
    RAISE EXCEPTION 'ai_billing_fuse: blocked charge of % credits (> 100 cap) for account % session %',
      NEW.amount, NEW.account_id, NEW.reference_id;
  END IF;

  IF NEW.description IS NOT NULL THEN
    v_match := regexp_match(NEW.description, '- (\d+)\s*min', 'i');
    IF v_match IS NOT NULL THEN
      v_minutes := v_match[1]::int;
      IF v_minutes > 60 THEN
        INSERT INTO public.ai_billing_anomalies (
          account_id, session_id, reference_type, original_log_id,
          billed_credits, billed_minutes, severity, status, detection_source, notes
        ) VALUES (
          NEW.account_id, NEW.reference_id, NEW.reference_type, NULL,
          NEW.amount, v_minutes, 'critical', 'blocked_by_fuse', 'fuse_trigger',
          jsonb_build_object('reason','duration_over_60min','description',NEW.description)
        );
        RAISE EXCEPTION 'ai_billing_fuse: blocked charge for % min (> 60 cap) for account % session %',
          v_minutes, NEW.account_id, NEW.reference_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_billing_fuse ON public.recruitment_usage_log;
CREATE TRIGGER trg_ai_billing_fuse
  BEFORE INSERT ON public.recruitment_usage_log
  FOR EACH ROW EXECUTE FUNCTION public.ai_billing_fuse_trigger();

-- 4) audit_overbilled_interviews
CREATE OR REPLACE FUNCTION public.audit_overbilled_interviews(
  p_dry_run BOOLEAN DEFAULT true,
  p_since TIMESTAMPTZ DEFAULT (now() - interval '180 days')
)
RETURNS TABLE(
  log_id UUID,
  account_id UUID,
  session_id UUID,
  session_type TEXT,
  billed_credits NUMERIC,
  billed_minutes NUMERIC,
  real_minutes NUMERIC,
  ratio NUMERIC,
  fair_credits NUMERIC,
  refund_amount NUMERIC,
  severity TEXT,
  action TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_real_minutes NUMERIC;
  v_billed_minutes NUMERIC;
  v_ratio NUMERIC;
  v_fair NUMERIC;
  v_refund NUMERIC;
  v_severity TEXT;
  v_refund_result JSONB;
  v_match TEXT[];
  v_anomaly_id UUID;
BEGIN
  FOR r IN
    SELECT l.id, l.account_id, l.amount, l.reference_id, l.reference_type, l.description, l.created_at
      FROM public.recruitment_usage_log l
     WHERE l.operation = 'consume'
       AND l.created_at >= p_since
       AND l.reference_type IN (
         'culture_interview','culture_interview_realtime','culture_interview_realtime_watchdog',
         'technical_interview','technical_interview_realtime','technical_interview_realtime_watchdog'
       )
       AND l.description ILIKE '%min%'
       AND NOT EXISTS (
         SELECT 1 FROM public.ai_billing_anomalies a WHERE a.original_log_id = l.id
       )
  LOOP
    v_match := regexp_match(r.description, '- (\d+)\s*min', 'i');
    IF v_match IS NULL THEN CONTINUE; END IF;
    v_billed_minutes := v_match[1]::numeric;

    v_real_minutes := NULL;
    IF r.reference_type ILIKE 'culture%' THEN
      SELECT EXTRACT(EPOCH FROM (COALESCE(last_activity_at, completed_at) - started_at)) / 60.0
        INTO v_real_minutes
        FROM public.culture_interview_sessions
       WHERE id = r.reference_id;
    ELSIF r.reference_type ILIKE 'technical%' THEN
      SELECT EXTRACT(EPOCH FROM (COALESCE(last_activity_at, completed_at) - started_at)) / 60.0
        INTO v_real_minutes
        FROM public.technical_interview_sessions
       WHERE id = r.reference_id;
    END IF;

    IF v_real_minutes IS NULL OR v_real_minutes <= 0 THEN CONTINUE; END IF;

    v_ratio := v_billed_minutes / v_real_minutes;
    IF v_ratio < 2.0 THEN CONTINUE; END IF;

    v_fair := ROUND((r.amount * v_real_minutes / v_billed_minutes) * 10) / 10;
    v_fair := GREATEST(v_fair, 0.1);
    v_refund := ROUND((r.amount - v_fair) * 10) / 10;
    IF v_refund <= 0 THEN CONTINUE; END IF;

    v_severity := CASE
      WHEN v_ratio >= 10 OR v_billed_minutes > 60 OR r.amount > 50 THEN 'critical'
      WHEN v_ratio >= 3 OR r.amount > 15 THEN 'high'
      WHEN v_ratio >= 2 OR r.amount > 5 THEN 'medium'
      ELSE 'low'
    END;

    log_id := r.id;
    account_id := r.account_id;
    session_id := r.reference_id;
    session_type := CASE WHEN r.reference_type ILIKE 'culture%' THEN 'culture' ELSE 'technical' END;
    billed_credits := r.amount;
    billed_minutes := v_billed_minutes;
    real_minutes := ROUND(v_real_minutes * 10) / 10;
    ratio := ROUND(v_ratio * 100) / 100;
    fair_credits := v_fair;
    refund_amount := v_refund;
    severity := v_severity;

    IF p_dry_run THEN
      action := 'dry_run';
    ELSE
      INSERT INTO public.ai_billing_anomalies (
        account_id, session_id, session_type, reference_type, original_log_id,
        billed_credits, billed_minutes, real_minutes, ratio,
        severity, status, auto_refund_amount, detection_source, notes
      ) VALUES (
        r.account_id, r.reference_id, session_type, r.reference_type, r.id,
        r.amount, v_billed_minutes, v_real_minutes, v_ratio,
        v_severity, 'auto_refunded', v_refund, 'audit_backfill',
        jsonb_build_object('original_description', r.description, 'original_created_at', r.created_at)
      )
      RETURNING id INTO v_anomaly_id;

      v_refund_result := public.refund_credits(
        r.account_id, 'universal', v_refund, r.reference_id, r.reference_type,
        format('Estorno automatico: cobranca %.1f cred (%s min) vs duracao real %.1f min', r.amount, v_billed_minutes, v_real_minutes),
        jsonb_build_object('anomaly_id', v_anomaly_id, 'original_log_id', r.id, 'source', 'audit_backfill')
      );

      UPDATE public.ai_billing_anomalies
         SET refund_log_id = (v_refund_result->>'log_id')::uuid,
             resolved_at = now(),
             resolution_notes = 'auto refunded by audit_overbilled_interviews'
       WHERE id = v_anomaly_id;

      action := 'refunded';
    END IF;

    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_overbilled_interviews(boolean, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_overbilled_interviews(boolean, timestamptz) TO service_role;