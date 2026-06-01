
-- =========================================================
-- Admin Voice Interview Monitoring — SECURITY DEFINER RPCs
-- Cross-tenant aggregations restricted to super admins.
-- =========================================================

-- 1) KPIs
CREATE OR REPLACE FUNCTION public.admin_voice_interview_kpis(
  p_type text,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_type = 'cultural' THEN
    SELECT jsonb_build_object(
      'total', COUNT(*),
      'last_24h', COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours'),
      'completed', COUNT(*) FILTER (WHERE status = 'completed'),
      'aborted', COUNT(*) FILTER (WHERE status IN ('abandoned','cancelled')),
      'qualified', COUNT(*) FILTER (WHERE status = 'completed' AND recommendation IN ('RECOMENDADO','RESSALVAS')),
      'avg_duration_seconds', COALESCE(AVG(
        CASE
          WHEN status = 'completed'
            AND COALESCE(duration_seconds, EXTRACT(EPOCH FROM (completed_at - started_at))::int) BETWEEN 1 AND 3600
          THEN COALESCE(duration_seconds, EXTRACT(EPOCH FROM (completed_at - started_at))::int)
        END
      ), 0)::int,
      'active_accounts', COUNT(DISTINCT account_id)
    )
    INTO v_result
    FROM public.culture_interview_sessions
    WHERE created_at >= p_start AND created_at < p_end
      AND archived_at IS NULL;
  ELSIF p_type = 'technical' THEN
    SELECT jsonb_build_object(
      'total', COUNT(*),
      'last_24h', COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours'),
      'completed', COUNT(*) FILTER (WHERE status = 'completed'),
      'aborted', COUNT(*) FILTER (WHERE status IN ('abandoned','cancelled')),
      'qualified', COUNT(*) FILTER (WHERE status = 'completed' AND recommendation IN ('RECOMENDADO','RESSALVAS')),
      'avg_duration_seconds', COALESCE(AVG(
        CASE
          WHEN status = 'completed'
            AND COALESCE(duration_seconds, EXTRACT(EPOCH FROM (completed_at - started_at))::int) BETWEEN 1 AND 3600
          THEN COALESCE(duration_seconds, EXTRACT(EPOCH FROM (completed_at - started_at))::int)
        END
      ), 0)::int,
      'active_accounts', COUNT(DISTINCT account_id)
    )
    INTO v_result
    FROM public.technical_interview_sessions
    WHERE created_at >= p_start AND created_at < p_end
      AND archived_at IS NULL
      AND is_test = false;
  ELSE
    RAISE EXCEPTION 'invalid type: %', p_type;
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_voice_interview_kpis(text, timestamptz, timestamptz) TO authenticated;

-- 2) Daily volume
CREATE OR REPLACE FUNCTION public.admin_voice_interview_daily(
  p_type text,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE(day date, total bigint, completed bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_type = 'cultural' THEN
    RETURN QUERY
    SELECT date_trunc('day', created_at)::date AS day,
           COUNT(*)::bigint AS total,
           COUNT(*) FILTER (WHERE status = 'completed')::bigint AS completed
    FROM public.culture_interview_sessions
    WHERE created_at >= p_start AND created_at < p_end
      AND archived_at IS NULL
    GROUP BY 1
    ORDER BY 1;
  ELSIF p_type = 'technical' THEN
    RETURN QUERY
    SELECT date_trunc('day', created_at)::date AS day,
           COUNT(*)::bigint AS total,
           COUNT(*) FILTER (WHERE status = 'completed')::bigint AS completed
    FROM public.technical_interview_sessions
    WHERE created_at >= p_start AND created_at < p_end
      AND archived_at IS NULL
      AND is_test = false
    GROUP BY 1
    ORDER BY 1;
  ELSE
    RAISE EXCEPTION 'invalid type: %', p_type;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_voice_interview_daily(text, timestamptz, timestamptz) TO authenticated;

-- 3) Recent interviews
CREATE OR REPLACE FUNCTION public.admin_voice_interview_recent(
  p_type text,
  p_start timestamptz,
  p_end timestamptz,
  p_account_id uuid DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  account_id uuid,
  account_name text,
  job_id uuid,
  job_title text,
  candidate_id uuid,
  candidate_name text,
  status text,
  duration_seconds int,
  score numeric,
  recommendation text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_type = 'cultural' THEN
    RETURN QUERY
    SELECT s.id,
           s.created_at,
           s.account_id,
           a.name AS account_name,
           s.job_id,
           j.title AS job_title,
           s.candidate_id,
           COALESCE(c.full_name, c.email) AS candidate_name,
           s.status,
           COALESCE(s.duration_seconds, EXTRACT(EPOCH FROM (s.completed_at - s.started_at))::int) AS duration_seconds,
           s.matching_score::numeric AS score,
           NULL::text AS recommendation
    FROM public.culture_interview_sessions s
    LEFT JOIN public.accounts a ON a.id = s.account_id
    LEFT JOIN public.recruitment_jobs j ON j.id = s.job_id
    LEFT JOIN public.recruitment_candidates c ON c.id = s.candidate_id
    WHERE s.created_at >= p_start AND s.created_at < p_end
      AND s.archived_at IS NULL
      AND (p_account_id IS NULL OR s.account_id = p_account_id)
    ORDER BY s.created_at DESC
    LIMIT p_limit;
  ELSIF p_type = 'technical' THEN
    RETURN QUERY
    SELECT s.id,
           s.created_at,
           s.account_id,
           a.name AS account_name,
           s.job_id,
           j.title AS job_title,
           s.candidate_id,
           COALESCE(c.full_name, c.email) AS candidate_name,
           s.status,
           COALESCE(s.duration_seconds, EXTRACT(EPOCH FROM (s.completed_at - s.started_at))::int) AS duration_seconds,
           s.overall_score::numeric AS score,
           s.recommendation
    FROM public.technical_interview_sessions s
    LEFT JOIN public.accounts a ON a.id = s.account_id
    LEFT JOIN public.recruitment_jobs j ON j.id = s.job_id
    LEFT JOIN public.recruitment_candidates c ON c.id = s.candidate_id
    WHERE s.created_at >= p_start AND s.created_at < p_end
      AND s.archived_at IS NULL
      AND s.is_test = false
      AND (p_account_id IS NULL OR s.account_id = p_account_id)
    ORDER BY s.created_at DESC
    LIMIT p_limit;
  ELSE
    RAISE EXCEPTION 'invalid type: %', p_type;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_voice_interview_recent(text, timestamptz, timestamptz, uuid, int) TO authenticated;

-- 4) By account
CREATE OR REPLACE FUNCTION public.admin_voice_interview_by_account(
  p_type text,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE(
  account_id uuid,
  account_name text,
  total bigint,
  completed bigint,
  qualified bigint,
  avg_duration_seconds int,
  last_activity_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_type = 'cultural' THEN
    RETURN QUERY
    SELECT s.account_id,
           a.name AS account_name,
           COUNT(*)::bigint AS total,
           COUNT(*) FILTER (WHERE s.status = 'completed')::bigint AS completed,
           COUNT(*) FILTER (WHERE s.status = 'completed' AND s.recommendation IN ('RECOMENDADO','RESSALVAS'))::bigint AS qualified,
           COALESCE(AVG(
             CASE WHEN s.status='completed'
               AND COALESCE(s.duration_seconds, EXTRACT(EPOCH FROM (s.completed_at - s.started_at))::int) BETWEEN 1 AND 3600
               THEN COALESCE(s.duration_seconds, EXTRACT(EPOCH FROM (s.completed_at - s.started_at))::int)
             END
           ), 0)::int AS avg_duration_seconds,
           MAX(s.created_at) AS last_activity_at
    FROM public.culture_interview_sessions s
    LEFT JOIN public.accounts a ON a.id = s.account_id
    WHERE s.created_at >= p_start AND s.created_at < p_end
      AND s.archived_at IS NULL
    GROUP BY s.account_id, a.name
    ORDER BY total DESC;
  ELSIF p_type = 'technical' THEN
    RETURN QUERY
    SELECT s.account_id,
           a.name AS account_name,
           COUNT(*)::bigint AS total,
           COUNT(*) FILTER (WHERE s.status = 'completed')::bigint AS completed,
           COUNT(*) FILTER (WHERE s.status = 'completed' AND s.recommendation IN ('RECOMENDADO','RESSALVAS'))::bigint AS qualified,
           COALESCE(AVG(
             CASE WHEN s.status='completed'
               AND COALESCE(s.duration_seconds, EXTRACT(EPOCH FROM (s.completed_at - s.started_at))::int) BETWEEN 1 AND 3600
               THEN COALESCE(s.duration_seconds, EXTRACT(EPOCH FROM (s.completed_at - s.started_at))::int)
             END
           ), 0)::int AS avg_duration_seconds,
           MAX(s.created_at) AS last_activity_at
    FROM public.technical_interview_sessions s
    LEFT JOIN public.accounts a ON a.id = s.account_id
    WHERE s.created_at >= p_start AND s.created_at < p_end
      AND s.archived_at IS NULL
      AND s.is_test = false
    GROUP BY s.account_id, a.name
    ORDER BY total DESC;
  ELSE
    RAISE EXCEPTION 'invalid type: %', p_type;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_voice_interview_by_account(text, timestamptz, timestamptz) TO authenticated;

-- 5) Detail (summary modal)
CREATE OR REPLACE FUNCTION public.admin_voice_interview_detail(
  p_type text,
  p_session_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_type = 'cultural' THEN
    SELECT jsonb_build_object(
      'id', s.id,
      'created_at', s.created_at,
      'status', s.status,
      'duration_seconds', COALESCE(s.duration_seconds, EXTRACT(EPOCH FROM (s.completed_at - s.started_at))::int),
      'score', s.matching_score,
      'recommendation', NULL,
      'summary', s.matching_analysis,
      'transcript', s.partial_transcript,
      'responses', s.responses,
      'account_name', a.name,
      'job_title', j.title,
      'candidate_name', COALESCE(c.full_name, c.email)
    )
    INTO v_result
    FROM public.culture_interview_sessions s
    LEFT JOIN public.accounts a ON a.id = s.account_id
    LEFT JOIN public.recruitment_jobs j ON j.id = s.job_id
    LEFT JOIN public.recruitment_candidates c ON c.id = s.candidate_id
    WHERE s.id = p_session_id;
  ELSIF p_type = 'technical' THEN
    SELECT jsonb_build_object(
      'id', s.id,
      'created_at', s.created_at,
      'status', s.status,
      'duration_seconds', COALESCE(s.duration_seconds, EXTRACT(EPOCH FROM (s.completed_at - s.started_at))::int),
      'score', s.overall_score,
      'recommendation', s.recommendation,
      'summary', s.evaluation_summary,
      'transcript', COALESCE(s.transcript, s.partial_transcript),
      'strengths', s.strengths,
      'gaps', s.gaps,
      'account_name', a.name,
      'job_title', j.title,
      'candidate_name', COALESCE(c.full_name, c.email)
    )
    INTO v_result
    FROM public.technical_interview_sessions s
    LEFT JOIN public.accounts a ON a.id = s.account_id
    LEFT JOIN public.recruitment_jobs j ON j.id = s.job_id
    LEFT JOIN public.recruitment_candidates c ON c.id = s.candidate_id
    WHERE s.id = p_session_id;
  ELSE
    RAISE EXCEPTION 'invalid type: %', p_type;
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_voice_interview_detail(text, uuid) TO authenticated;
