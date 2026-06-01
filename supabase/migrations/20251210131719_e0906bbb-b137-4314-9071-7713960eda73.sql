-- Create app_role enum if it doesn't exist (for super admin check)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table for super admin tracking
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy for user_roles - only super_admins can view
CREATE POLICY "Super admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
  )
  OR user_id = auth.uid()
);

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role = 'super_admin'
  )
$$;

-- Function to get all companies progress (for super admins only)
CREATE OR REPLACE FUNCTION public.get_all_companies_progress()
RETURNS TABLE (
  company_id uuid,
  company_name text,
  company_slug text,
  member_count bigint,
  mission_stage int,
  vision_stage int,
  values_stage int,
  indicators_stage int,
  decision_stage int,
  energy_stage int,
  development_stage int,
  event_stage int,
  ritual_stage int,
  company_created_at timestamptz,
  last_activity timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.name,
    c.slug,
    (SELECT COUNT(*) FROM account_members am WHERE am.account_id = c.id),
    ms.stage,
    vs.stage,
    vals.stage,
    si.stage,
    ds.stage,
    es.stage,
    devs.stage,
    evs.stage,
    rs.stage,
    c.created_at,
    GREATEST(
      COALESCE(ms.updated_at, c.created_at), 
      COALESCE(vs.updated_at, c.created_at), 
      COALESCE(vals.updated_at, c.created_at),
      COALESCE(ds.updated_at, c.created_at), 
      COALESCE(es.updated_at, c.created_at), 
      COALESCE(devs.updated_at, c.created_at),
      COALESCE(evs.updated_at, c.created_at), 
      COALESCE(rs.updated_at, c.created_at)
    )
  FROM companies c
  LEFT JOIN mission_sessions ms ON ms.account_id = c.id
  LEFT JOIN vision_sessions vs ON vs.account_id = c.id
  LEFT JOIN values_sessions vals ON vals.account_id = c.id
  LEFT JOIN strategic_indicators si ON si.account_id = c.id
  LEFT JOIN decision_sessions ds ON ds.account_id = c.id
  LEFT JOIN energy_sessions es ON es.account_id = c.id
  LEFT JOIN development_sessions devs ON devs.account_id = c.id
  LEFT JOIN event_sessions evs ON evs.account_id = c.id
  LEFT JOIN ritual_sessions rs ON rs.account_id = c.id
  WHERE is_super_admin(auth.uid())
  ORDER BY c.created_at DESC
$$;

-- Function to get company details (for super admins)
CREATE OR REPLACE FUNCTION public.get_company_details(_company_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'company', (SELECT row_to_json(c) FROM companies c WHERE c.id = _company_id),
    'members', (
      SELECT json_agg(json_build_object(
        'id', am.id,
        'user_id', am.user_id,
        'role', am.role,
        'email', p.email,
        'first_name', p.first_name,
        'last_name', p.last_name
      ))
      FROM account_members am
      LEFT JOIN profiles p ON p.id = am.user_id
      WHERE am.account_id = _company_id
    ),
    'mission', (SELECT row_to_json(ms) FROM mission_sessions ms WHERE ms.account_id = _company_id),
    'vision', (SELECT row_to_json(vs) FROM vision_sessions vs WHERE vs.account_id = _company_id),
    'values', (SELECT row_to_json(vals) FROM values_sessions vals WHERE vals.account_id = _company_id),
    'indicators', (SELECT row_to_json(si) FROM strategic_indicators si WHERE si.account_id = _company_id),
    'decision', (SELECT row_to_json(ds) FROM decision_sessions ds WHERE ds.account_id = _company_id),
    'energy', (SELECT row_to_json(es) FROM energy_sessions es WHERE es.account_id = _company_id),
    'development', (SELECT row_to_json(devs) FROM development_sessions devs WHERE devs.account_id = _company_id),
    'event', (SELECT row_to_json(evs) FROM event_sessions evs WHERE evs.account_id = _company_id),
    'ritual', (SELECT row_to_json(rs) FROM ritual_sessions rs WHERE rs.account_id = _company_id)
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to get company values with behaviors (for super admins)
CREATE OR REPLACE FUNCTION public.get_company_values_detail(_company_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  session_id uuid;
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RETURN NULL;
  END IF;

  SELECT id INTO session_id FROM values_sessions WHERE account_id = _company_id LIMIT 1;
  
  IF session_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'session', (SELECT row_to_json(vs) FROM values_sessions vs WHERE vs.id = session_id),
    'final_values', (
      SELECT json_agg(json_build_object(
        'value_id', sel.value_id,
        'label', vc.label,
        'position', sel.position
      ) ORDER BY sel.position)
      FROM values_selections sel
      JOIN values_catalog vc ON vc.id = sel.value_id
      WHERE sel.session_id = session_id AND sel.phase = 3
    ),
    'behaviors', (
      SELECT json_agg(json_build_object(
        'value_label', bs.value_label,
        'do_selected', bs.do_selected,
        'dont_selected', bs.dont_selected
      ))
      FROM values_behaviors_selections bs
      WHERE bs.session_id = session_id
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to get company decision answers (for super admins)
CREATE OR REPLACE FUNCTION public.get_company_decision_detail(_company_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  session_id uuid;
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RETURN NULL;
  END IF;

  SELECT id INTO session_id FROM decision_sessions WHERE account_id = _company_id LIMIT 1;
  
  IF session_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'session', (SELECT row_to_json(ds) FROM decision_sessions ds WHERE ds.id = session_id),
    'answers', (
      SELECT json_agg(json_build_object(
        'question_number', da.question_number,
        'answer_text', da.answer_text,
        'is_suggestion', da.is_suggestion
      ) ORDER BY da.question_number, da.created_at)
      FROM decision_answers da
      WHERE da.session_id = session_id
    )
  ) INTO result;

  RETURN result;
END;
$$;