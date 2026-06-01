-- =========================================
-- PULSE DE-ANONYMIZATION MITIGATION
-- Threshold: 5 members minimum for individual response visibility
-- =========================================

-- 1. Adicionar coluna de threshold configurável na tabela de regras
ALTER TABLE public.pulse_schedule_rules 
ADD COLUMN IF NOT EXISTS anonymity_threshold integer DEFAULT 5;

COMMENT ON COLUMN public.pulse_schedule_rules.anonymity_threshold IS 'Minimum team size for individual anonymous response visibility (default 5)';

-- 2. Criar função para verificar se equipe atende threshold
CREATE OR REPLACE FUNCTION public.can_view_team_responses(
  _user_id uuid,
  _team_id uuid,
  _account_id uuid
) RETURNS boolean
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_size integer;
  min_threshold integer;
  is_admin boolean;
BEGIN
  -- Verificar se é admin (admins sempre podem ver)
  SELECT EXISTS (
    SELECT 1 FROM pulse_user_profiles
    WHERE user_id = _user_id 
      AND account_id = _account_id 
      AND role = 'admin_rh'
      AND is_active = true
  ) INTO is_admin;
  
  IF is_admin THEN
    RETURN true;
  END IF;
  
  -- Se não tem team_id, não pode ver
  IF _team_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Buscar threshold configurado para a conta (default 5)
  SELECT COALESCE(anonymity_threshold, 5) INTO min_threshold
  FROM pulse_schedule_rules
  WHERE account_id = _account_id
  LIMIT 1;
  
  -- Se não encontrou regra, usar default
  IF min_threshold IS NULL THEN
    min_threshold := 5;
  END IF;
  
  -- Contar membros ativos na equipe
  SELECT COUNT(*) INTO team_size
  FROM pulse_user_profiles
  WHERE team_id = _team_id 
    AND is_active = true;
  
  -- Retornar true se equipe >= threshold
  RETURN team_size >= min_threshold;
END;
$$;

-- 3. Criar função helper para obter tamanho da equipe
CREATE OR REPLACE FUNCTION public.get_team_size(_team_id uuid)
RETURNS integer
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM pulse_user_profiles
  WHERE team_id = _team_id 
    AND is_active = true;
$$;

-- 4. Criar função helper para obter threshold da conta
CREATE OR REPLACE FUNCTION public.get_account_anonymity_threshold(_account_id uuid)
RETURNS integer
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT anonymity_threshold FROM pulse_schedule_rules WHERE account_id = _account_id LIMIT 1),
    5
  );
$$;

-- 5. Criar view agregada para respostas de equipes pequenas
CREATE OR REPLACE VIEW public.pulse_responses_aggregated AS
SELECT 
  pr.account_id,
  pr.respondent_team_id,
  pr.question_id,
  DATE_TRUNC('week', pr.date::timestamp)::date as week_start,
  -- Métricas agregadas
  ROUND(AVG(pr.numeric_score)::numeric, 2) as avg_score,
  COUNT(*)::integer as response_count,
  MIN(pr.date) as first_date,
  MAX(pr.date) as last_date,
  -- Metadata da equipe
  pt.name as team_name
FROM pulse_responses pr
LEFT JOIN pulse_teams pt ON pt.id = pr.respondent_team_id
WHERE pr.is_anonymous = true
GROUP BY 
  pr.account_id,
  pr.respondent_team_id,
  pr.question_id,
  DATE_TRUNC('week', pr.date::timestamp),
  pt.name;

-- 6. Grant permissions
GRANT SELECT ON public.pulse_responses_aggregated TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_team_responses(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_size(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_anonymity_threshold(uuid) TO authenticated;