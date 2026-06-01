-- ============================================================================
-- FASE 4 — Aposta B: Portal realtime + Auto-shortlist + Onboarding
-- ============================================================================

-- ---------- 1. client_portal_activity_log ----------
CREATE TABLE IF NOT EXISTS public.client_portal_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  job_id uuid,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  seen_by_client boolean NOT NULL DEFAULT false,
  seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cpa_log_cliente_created ON public.client_portal_activity_log (cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cpa_log_job ON public.client_portal_activity_log (job_id);
CREATE INDEX IF NOT EXISTS idx_cpa_log_account ON public.client_portal_activity_log (account_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cpa_log_shortlist_unique
  ON public.client_portal_activity_log (job_id, event_type)
  WHERE event_type = 'shortlist_ready';

ALTER TABLE public.client_portal_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members read activity log"
  ON public.client_portal_activity_log FOR SELECT
  USING (public.user_has_account_access(account_id));

CREATE POLICY "Account members insert activity log"
  ON public.client_portal_activity_log FOR INSERT
  WITH CHECK (public.user_has_account_access(account_id));

CREATE POLICY "Account members update activity log"
  ON public.client_portal_activity_log FOR UPDATE
  USING (public.user_has_account_access(account_id));

-- ---------- 2. account_onboarding_progress ----------
CREATE TABLE IF NOT EXISTS public.account_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE,
  step_profile_done boolean NOT NULL DEFAULT false,
  step_client_done boolean NOT NULL DEFAULT false,
  step_job_done boolean NOT NULL DEFAULT false,
  step_agent_done boolean NOT NULL DEFAULT false,
  step_candidate_done boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  dismissed_at timestamptz,
  dismissed_until timestamptz,
  skipped_steps text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members read onboarding"
  ON public.account_onboarding_progress FOR SELECT
  USING (public.user_has_account_access(account_id));

CREATE POLICY "Account members write onboarding"
  ON public.account_onboarding_progress FOR INSERT
  WITH CHECK (public.user_has_account_access(account_id));

CREATE POLICY "Account members update onboarding"
  ON public.account_onboarding_progress FOR UPDATE
  USING (public.user_has_account_access(account_id));

CREATE TRIGGER update_account_onboarding_progress_updated_at
  BEFORE UPDATE ON public.account_onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 3. Colunas em recruitment_jobs ----------
ALTER TABLE public.recruitment_jobs
  ADD COLUMN IF NOT EXISTS autopilot_min_candidates integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS autopilot_min_score numeric DEFAULT 7.0,
  ADD COLUMN IF NOT EXISTS autopilot_triggered_at timestamptz;

-- ---------- 4. Realtime ----------
ALTER TABLE public.client_portal_activity_log REPLICA IDENTITY FULL;
ALTER TABLE public.recruitment_applications REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.client_portal_activity_log;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.recruitment_applications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ---------- 5. RPC: get_portal_activity_by_token ----------
CREATE OR REPLACE FUNCTION public.get_portal_activity_by_token(
  p_token text,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  cliente_id uuid,
  job_id uuid,
  event_type text,
  event_data jsonb,
  seen_by_client boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
BEGIN
  SELECT pca.cliente_id INTO v_cliente_id
  FROM public.portal_clientes_acesso pca
  WHERE pca.token_acesso = p_token AND pca.ativo = true
  LIMIT 1;

  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive portal token';
  END IF;

  RETURN QUERY
  SELECT l.id, l.cliente_id, l.job_id, l.event_type, l.event_data, l.seen_by_client, l.created_at
  FROM public.client_portal_activity_log l
  WHERE l.cliente_id = v_cliente_id
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ---------- 6. RPC: mark_portal_events_seen ----------
CREATE OR REPLACE FUNCTION public.mark_portal_events_seen(
  p_token text,
  p_event_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
  v_count integer;
BEGIN
  SELECT pca.cliente_id INTO v_cliente_id
  FROM public.portal_clientes_acesso pca
  WHERE pca.token_acesso = p_token AND pca.ativo = true
  LIMIT 1;

  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive portal token';
  END IF;

  UPDATE public.client_portal_activity_log
  SET seen_by_client = true, seen_at = now()
  WHERE id = ANY(p_event_ids)
    AND cliente_id = v_cliente_id
    AND seen_by_client = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ---------- 7. RPC: get_portal_funnel_counts ----------
CREATE OR REPLACE FUNCTION public.get_portal_funnel_counts(
  p_token text,
  p_job_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
  v_job_cliente uuid;
  v_result jsonb;
BEGIN
  SELECT pca.cliente_id INTO v_cliente_id
  FROM public.portal_clientes_acesso pca
  WHERE pca.token_acesso = p_token AND pca.ativo = true
  LIMIT 1;

  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive portal token';
  END IF;

  SELECT cliente_id INTO v_job_cliente
  FROM public.recruitment_jobs
  WHERE id = p_job_id;

  IF v_job_cliente IS NULL OR v_job_cliente <> v_cliente_id THEN
    RAISE EXCEPTION 'Job does not belong to this client';
  END IF;

  SELECT jsonb_build_object(
    'searching',  COUNT(*) FILTER (WHERE status IN ('new','sourcing','searching','applied')),
    'screening',  COUNT(*) FILTER (WHERE status IN ('screening','triage')),
    'cultural',   COUNT(*) FILTER (WHERE status IN ('cultural_interview','culture_interview','cultural')),
    'disc',       COUNT(*) FILTER (WHERE status IN ('disc','disc_assessment','behavioral')),
    'technical',  COUNT(*) FILTER (WHERE status IN ('technical','technical_interview')),
    'shortlist',  COUNT(*) FILTER (WHERE status IN ('shortlisted','shortlist','approved'))
  ) INTO v_result
  FROM public.recruitment_applications
  WHERE job_id = p_job_id;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_portal_activity_by_token(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_portal_events_seen(text, uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_portal_funnel_counts(text, uuid) TO anon, authenticated;