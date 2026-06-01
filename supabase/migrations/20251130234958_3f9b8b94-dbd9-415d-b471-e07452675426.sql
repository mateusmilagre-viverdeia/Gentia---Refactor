-- Fix security warning: set search_path for the trigger function
CREATE OR REPLACE FUNCTION public.update_values_sessions_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;