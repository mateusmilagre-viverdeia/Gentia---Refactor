-- Fix search_path for the new function
CREATE OR REPLACE FUNCTION public.update_member_last_access(p_user_id UUID, p_account_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.account_members
  SET last_access_at = NOW()
  WHERE user_id = p_user_id AND account_id = p_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;