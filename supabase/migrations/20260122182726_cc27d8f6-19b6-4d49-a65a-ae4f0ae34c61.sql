CREATE OR REPLACE FUNCTION public.get_default_permissions_for_role(p_role public.account_role)
RETURNS TABLE(module_slug text, can_view boolean, can_create boolean, can_edit boolean, can_delete boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.slug,
    -- VISUALIZAÇÃO
    CASE 
      -- Viewer não vê módulos de conta (exceto empresa)
      WHEN p_role = 'viewer' AND m.category = 'conta' AND m.slug != 'conta_empresa' THEN FALSE
      -- MEMBRO não vê usuários nem permissões
      WHEN p_role = 'member' AND m.slug IN ('conta_usuarios', 'conta_permissoes') THEN FALSE
      ELSE TRUE
    END,
    -- CRIAR
    CASE 
      WHEN p_role IN ('owner', 'admin') THEN TRUE
      WHEN p_role = 'admin_rh' AND m.category IN ('cultura', 'atracao', 'contratacao', 'retencao') THEN TRUE
      WHEN p_role = 'leader' AND m.category = 'retencao' AND m.slug IN ('retencao_pulse', 'retencao_disc') THEN TRUE
      -- MEMBRO não pode criar nada
      ELSE FALSE
    END,
    -- EDITAR
    CASE 
      WHEN p_role IN ('owner', 'admin') THEN TRUE
      WHEN p_role = 'admin_rh' AND m.category IN ('cultura', 'atracao', 'contratacao', 'retencao') THEN TRUE
      WHEN p_role = 'leader' AND m.category = 'retencao' AND m.slug IN ('retencao_pulse', 'retencao_disc') THEN TRUE
      -- MEMBRO não pode editar nada (removido acesso a Pulse/DISC)
      ELSE FALSE
    END,
    -- DELETAR
    CASE 
      WHEN p_role IN ('owner', 'admin') THEN TRUE
      WHEN p_role = 'admin_rh' AND m.category IN ('cultura', 'atracao', 'contratacao', 'retencao') THEN TRUE
      ELSE FALSE
    END
  FROM public.modules m
  ORDER BY m.sort_order;
END;
$$;