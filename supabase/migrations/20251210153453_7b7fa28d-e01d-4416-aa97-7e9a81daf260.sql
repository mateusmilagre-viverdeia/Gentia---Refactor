-- Function to get strategic projects detail
CREATE OR REPLACE FUNCTION public.get_company_projects_detail(_company_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT json_agg(json_build_object(
      'id', sp.id,
      'project_name', sp.project_name,
      'description', sp.description,
      'perspective', sp.perspective,
      'importance', sp.importance,
      'linked_indicator', sp.linked_indicator,
      'responsible', sp.responsible,
      'start_quarter', sp.start_quarter,
      'segment', sp.segment,
      'is_custom', sp.is_custom
    ) ORDER BY sp.perspective, sp.created_at)
    FROM strategic_projects sp
    WHERE sp.account_id = _company_id
  );
END;
$$;

-- Function to get energy selections detail
CREATE OR REPLACE FUNCTION public.get_company_energy_detail(_company_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_id uuid;
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RETURN NULL;
  END IF;

  SELECT id INTO session_id FROM energy_sessions WHERE account_id = _company_id LIMIT 1;
  
  IF session_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'session', (SELECT row_to_json(es) FROM energy_sessions es WHERE es.id = session_id),
    'selections', (
      SELECT json_agg(json_build_object(
        'item_id', sel.item_id,
        'phase', sel.phase,
        'label', ec.label,
        'category', ec.category,
        'category_label', ec.category_label
      ) ORDER BY sel.phase, ec.category)
      FROM energy_selections sel
      JOIN energy_catalog ec ON ec.id = sel.item_id
      WHERE sel.session_id = session_id
    )
  );
END;
$$;

-- Function to get development selections detail
CREATE OR REPLACE FUNCTION public.get_company_development_detail(_company_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_id uuid;
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RETURN NULL;
  END IF;

  SELECT id INTO session_id FROM development_sessions WHERE account_id = _company_id LIMIT 1;
  
  IF session_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'session', (SELECT row_to_json(ds) FROM development_sessions ds WHERE ds.id = session_id),
    'selections', (
      SELECT json_agg(json_build_object(
        'item_id', sel.item_id,
        'phase', sel.phase,
        'label', dc.label,
        'category', dc.category,
        'category_label', dc.category_label
      ) ORDER BY sel.phase, dc.category)
      FROM development_selections sel
      JOIN development_catalog dc ON dc.id = sel.item_id
      WHERE sel.session_id = session_id
    )
  );
END;
$$;

-- Function to get event items detail
CREATE OR REPLACE FUNCTION public.get_company_event_detail(_company_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_id uuid;
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RETURN NULL;
  END IF;

  SELECT id INTO session_id FROM event_sessions WHERE account_id = _company_id LIMIT 1;
  
  IF session_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'session', (SELECT row_to_json(es) FROM event_sessions es WHERE es.id = session_id),
    'items', (
      SELECT json_agg(json_build_object(
        'id', ei.id,
        'pillar_number', ei.pillar_number,
        'item_text', ei.item_text,
        'source', ei.source
      ) ORDER BY ei.pillar_number, ei.created_at)
      FROM event_items ei
      WHERE ei.session_id = session_id
    )
  );
END;
$$;

-- Function to get ritual items detail
CREATE OR REPLACE FUNCTION public.get_company_ritual_detail(_company_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_id uuid;
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RETURN NULL;
  END IF;

  SELECT id INTO session_id FROM ritual_sessions WHERE account_id = _company_id LIMIT 1;
  
  IF session_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'session', (SELECT row_to_json(rs) FROM ritual_sessions rs WHERE rs.id = session_id),
    'items', (
      SELECT json_agg(json_build_object(
        'id', ri.id,
        'pillar_number', ri.pillar_number,
        'item_text', ri.item_text,
        'source', ri.source
      ) ORDER BY ri.pillar_number, ri.created_at)
      FROM ritual_items ri
      WHERE ri.session_id = session_id
    )
  );
END;
$$;

-- Function to get indicators detail
CREATE OR REPLACE FUNCTION public.get_company_indicators_detail(_company_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT row_to_json(si)
    FROM strategic_indicators si
    WHERE si.account_id = _company_id
    LIMIT 1
  );
END;
$$;