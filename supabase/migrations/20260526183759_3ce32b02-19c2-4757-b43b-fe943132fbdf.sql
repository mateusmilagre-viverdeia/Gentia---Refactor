
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
    SELECT s.id, s.created_at, s.account_id, a.name,
           s.job_id, j.title, s.candidate_id,
           NULLIF(TRIM(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,'')), '') ,
           s.status,
           COALESCE(s.duration_seconds, EXTRACT(EPOCH FROM (s.completed_at - s.started_at))::int),
           s.matching_score::numeric,
           NULL::text
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
    SELECT s.id, s.created_at, s.account_id, a.name,
           s.job_id, j.title, s.candidate_id,
           NULLIF(TRIM(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,'')), ''),
           s.status,
           COALESCE(s.duration_seconds, EXTRACT(EPOCH FROM (s.completed_at - s.started_at))::int),
           s.overall_score::numeric,
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
      'candidate_name', NULLIF(TRIM(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,'')), '')
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
      'candidate_name', NULLIF(TRIM(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,'')), '')
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
