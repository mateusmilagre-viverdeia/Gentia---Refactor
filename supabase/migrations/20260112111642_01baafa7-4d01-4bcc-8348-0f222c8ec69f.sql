-- Create function to assign candidate role on signup via candidate journey
CREATE OR REPLACE FUNCTION public.assign_candidate_role(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user already has candidate role
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'candidate') THEN
    RETURN TRUE;
  END IF;
  
  -- Insert candidate role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'candidate');
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Create function to check if user has candidate role
CREATE OR REPLACE FUNCTION public.is_candidate(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_user_id
      AND role = 'candidate'
  )
$$;