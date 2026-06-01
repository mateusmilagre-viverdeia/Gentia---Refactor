-- Update can_manage_consultants function to include EP Partners
CREATE OR REPLACE FUNCTION public.can_manage_consultants(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_super_admin(_user_id)
    OR is_head_cs(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
      AND role = 'ep_partner'
    )
$$;