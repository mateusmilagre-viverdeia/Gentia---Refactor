-- Fix format() specifier (Postgres only supports %s, %I, %L)
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
        'Estorno automatico: cobranca ' || r.amount::text || ' cred (' || v_billed_minutes::text || ' min) vs duracao real ' || ROUND(v_real_minutes, 1)::text || ' min',
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

-- Run the backfill now
CREATE TABLE IF NOT EXISTS public.ai_billing_audit_report_20260524 (
  log_id UUID PRIMARY KEY,
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
  action TEXT,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_billing_audit_report_20260524 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins view audit report" ON public.ai_billing_audit_report_20260524;
CREATE POLICY "Super admins view audit report"
  ON public.ai_billing_audit_report_20260524 FOR SELECT
  USING (public.is_super_admin(auth.uid()));

INSERT INTO public.ai_billing_audit_report_20260524 (
  log_id, account_id, session_id, session_type, billed_credits, billed_minutes,
  real_minutes, ratio, fair_credits, refund_amount, severity, action
)
SELECT log_id, account_id, session_id, session_type, billed_credits, billed_minutes,
       real_minutes, ratio, fair_credits, refund_amount, severity, action
  FROM public.audit_overbilled_interviews(false, '2025-01-01'::timestamptz)
ON CONFLICT (log_id) DO NOTHING;