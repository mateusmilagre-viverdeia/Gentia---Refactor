
-- Super Admin global candidates overview RPCs (aggregated only, no PII)

CREATE OR REPLACE FUNCTION public.admin_candidates_overview(
  _from timestamptz DEFAULT (now() - interval '30 days'),
  _to timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: super admin only';
  END IF;

  SELECT jsonb_build_object(
    'total_candidates', (SELECT count(*) FROM public.recruitment_candidates WHERE coalesce(is_demo,false)=false AND coalesce(is_test,false)=false),
    'new_7d', (SELECT count(*) FROM public.recruitment_candidates WHERE created_at >= now() - interval '7 days' AND coalesce(is_demo,false)=false AND coalesce(is_test,false)=false),
    'new_30d', (SELECT count(*) FROM public.recruitment_candidates WHERE created_at >= now() - interval '30 days' AND coalesce(is_demo,false)=false AND coalesce(is_test,false)=false),
    'new_in_range', (SELECT count(*) FROM public.recruitment_candidates WHERE created_at BETWEEN _from AND _to AND coalesce(is_demo,false)=false AND coalesce(is_test,false)=false),
    'total_applications', (SELECT count(*) FROM public.recruitment_applications WHERE coalesce(is_demo,false)=false),
    'applications_in_range', (SELECT count(*) FROM public.recruitment_applications WHERE applied_at BETWEEN _from AND _to AND coalesce(is_demo,false)=false),
    'accounts_with_candidates', (SELECT count(DISTINCT account_id) FROM public.recruitment_candidates WHERE coalesce(is_demo,false)=false AND coalesce(is_test,false)=false),
    'by_status', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('status', coalesce(status,'unknown'), 'count', c)), '[]'::jsonb)
      FROM (
        SELECT status, count(*) AS c
        FROM public.recruitment_candidates
        WHERE coalesce(is_demo,false)=false AND coalesce(is_test,false)=false
        GROUP BY status
        ORDER BY c DESC
      ) s
    ),
    'by_source', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('source', coalesce(source,'unknown'), 'count', c)), '[]'::jsonb)
      FROM (
        SELECT source, count(*) AS c
        FROM public.recruitment_candidates
        WHERE coalesce(is_demo,false)=false AND coalesce(is_test,false)=false
        GROUP BY source
        ORDER BY c DESC
        LIMIT 15
      ) s
    )
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_candidates_by_account(
  _limit int DEFAULT 50
)
RETURNS TABLE (
  account_id uuid,
  account_name text,
  total_candidates bigint,
  new_30d bigint,
  total_applications bigint,
  last_candidate_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: super admin only';
  END IF;

  RETURN QUERY
  SELECT
    rc.account_id,
    coalesce(co.name, 'Sem nome') AS account_name,
    count(*)::bigint AS total_candidates,
    count(*) FILTER (WHERE rc.created_at >= now() - interval '30 days')::bigint AS new_30d,
    (SELECT count(*)::bigint FROM public.recruitment_applications ra WHERE ra.account_id = rc.account_id AND coalesce(ra.is_demo,false)=false) AS total_applications,
    max(rc.created_at) AS last_candidate_at
  FROM public.recruitment_candidates rc
  LEFT JOIN public.companies co ON co.id = rc.account_id
  WHERE coalesce(rc.is_demo,false)=false AND coalesce(rc.is_test,false)=false
  GROUP BY rc.account_id, co.name
  ORDER BY total_candidates DESC
  LIMIT _limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_candidates_timeseries(
  _days int DEFAULT 30
)
RETURNS TABLE (day date, candidates bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: super admin only';
  END IF;

  RETURN QUERY
  WITH series AS (
    SELECT generate_series(
      (current_date - (_days - 1) * interval '1 day')::date,
      current_date,
      interval '1 day'
    )::date AS d
  )
  SELECT
    s.d AS day,
    coalesce(count(rc.id), 0)::bigint AS candidates
  FROM series s
  LEFT JOIN public.recruitment_candidates rc
    ON rc.created_at::date = s.d
    AND coalesce(rc.is_demo,false)=false
    AND coalesce(rc.is_test,false)=false
  GROUP BY s.d
  ORDER BY s.d;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_candidates_overview(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_candidates_by_account(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_candidates_timeseries(int) TO authenticated;
