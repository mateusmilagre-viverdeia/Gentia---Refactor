CREATE OR REPLACE FUNCTION public.get_disc_match_scores(p_session_ids uuid[])
RETURNS TABLE(session_id uuid, match_score numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.session_id, r.match_score
  FROM candidate_disc_results r
  JOIN candidate_disc_sessions s ON s.id = r.session_id
  JOIN account_members am ON am.account_id = s.account_id
  WHERE r.session_id = ANY(p_session_ids)
    AND am.user_id = auth.uid()
    AND am.is_active = true;
$$;