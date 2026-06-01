
-- Fix: adicionar acesso para super admins e consultores
CREATE OR REPLACE FUNCTION public.get_disc_match_scores(p_session_ids uuid[])
RETURNS TABLE(session_id uuid, match_score numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.session_id, r.match_score
  FROM candidate_disc_results r
  JOIN candidate_disc_sessions s ON s.id = r.session_id
  WHERE r.session_id = ANY(p_session_ids)
    AND (
      EXISTS (SELECT 1 FROM account_members am
              WHERE am.account_id = s.account_id
                AND am.user_id = auth.uid() AND am.is_active = true)
      OR can_edit_client_project(auth.uid(), s.account_id)
    );
$$;

-- Nova: retorna resultado completo do DISC
CREATE OR REPLACE FUNCTION public.get_disc_full_results(p_session_ids uuid[])
RETURNS TABLE(
  session_id uuid, match_score numeric,
  d_normalized numeric, i_normalized numeric,
  s_normalized numeric, c_normalized numeric,
  d_score numeric, i_score numeric,
  s_score numeric, c_score numeric,
  primary_profile text, secondary_profile text,
  intensity text, is_balanced boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.session_id, r.match_score,
         r.d_normalized, r.i_normalized, r.s_normalized, r.c_normalized,
         r.d_score, r.i_score, r.s_score, r.c_score,
         r.primary_profile, r.secondary_profile,
         r.intensity, r.is_balanced
  FROM candidate_disc_results r
  JOIN candidate_disc_sessions s ON s.id = r.session_id
  WHERE r.session_id = ANY(p_session_ids)
    AND (
      EXISTS (SELECT 1 FROM account_members am
              WHERE am.account_id = s.account_id
                AND am.user_id = auth.uid() AND am.is_active = true)
      OR can_edit_client_project(auth.uid(), s.account_id)
    );
$$;
