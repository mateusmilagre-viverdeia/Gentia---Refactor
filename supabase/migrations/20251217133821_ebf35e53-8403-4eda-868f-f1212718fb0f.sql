-- Function to securely assign EP roles with permission validation
CREATE OR REPLACE FUNCTION public.assign_ep_role(
  _target_user_id UUID,
  _role app_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_super_admin BOOLEAN;
  caller_is_head_cs BOOLEAN;
BEGIN
  -- Check caller's roles
  caller_is_super_admin := is_super_admin(auth.uid());
  caller_is_head_cs := is_head_cs(auth.uid());
  
  -- Rule 1: Nobody can assign super_admin via this function
  IF _role = 'super_admin' THEN
    RAISE EXCEPTION 'Não é permitido atribuir role super_admin';
  END IF;
  
  -- Rule 2: Only super_admin can assign head_cs
  IF _role = 'head_cs' AND NOT caller_is_super_admin THEN
    RAISE EXCEPTION 'Apenas Super Admin pode atribuir Head CS';
  END IF;
  
  -- Rule 3: Only super_admin OR head_cs can assign ep_consultant
  IF _role = 'ep_consultant' AND NOT (caller_is_super_admin OR caller_is_head_cs) THEN
    RAISE EXCEPTION 'Apenas Super Admin ou Head CS podem atribuir Consultor EP';
  END IF;
  
  -- Rule 4: Block account roles (these use invite system)
  IF _role IN ('admin', 'user') THEN
    RAISE EXCEPTION 'Use o sistema de convites para roles de conta';
  END IF;
  
  -- Insert role (ignore if already exists)
  INSERT INTO user_roles (user_id, role)
  VALUES (_target_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN TRUE;
END;
$$;

-- Function to securely remove EP roles with permission validation
CREATE OR REPLACE FUNCTION public.remove_ep_role(
  _target_user_id UUID,
  _role app_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_super_admin BOOLEAN;
  caller_is_head_cs BOOLEAN;
BEGIN
  -- Check caller's roles
  caller_is_super_admin := is_super_admin(auth.uid());
  caller_is_head_cs := is_head_cs(auth.uid());
  
  -- Rule 1: Nobody can remove super_admin via this function
  IF _role = 'super_admin' THEN
    RAISE EXCEPTION 'Não é permitido remover role super_admin';
  END IF;
  
  -- Rule 2: Only super_admin can remove head_cs
  IF _role = 'head_cs' AND NOT caller_is_super_admin THEN
    RAISE EXCEPTION 'Apenas Super Admin pode remover Head CS';
  END IF;
  
  -- Rule 3: Only super_admin OR head_cs can remove ep_consultant
  IF _role = 'ep_consultant' AND NOT (caller_is_super_admin OR caller_is_head_cs) THEN
    RAISE EXCEPTION 'Apenas Super Admin ou Head CS podem remover Consultor EP';
  END IF;
  
  -- Rule 4: Block account roles
  IF _role IN ('admin', 'user') THEN
    RAISE EXCEPTION 'Use o sistema de convites para roles de conta';
  END IF;
  
  -- Delete role
  DELETE FROM user_roles
  WHERE user_id = _target_user_id AND role = _role;
  
  RETURN TRUE;
END;
$$;

-- Drop existing permissive policies if any
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Block direct INSERT on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Block direct UPDATE on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Block direct DELETE on user_roles" ON public.user_roles;

-- RLS Policy: Users can only view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS Policy: Block all direct INSERTs (must use assign_ep_role function)
CREATE POLICY "Block direct INSERT on user_roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (false);

-- RLS Policy: Block all direct UPDATEs
CREATE POLICY "Block direct UPDATE on user_roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- RLS Policy: Block all direct DELETEs (must use remove_ep_role function)
CREATE POLICY "Block direct DELETE on user_roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (false);