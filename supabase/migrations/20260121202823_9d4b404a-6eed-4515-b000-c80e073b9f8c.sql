-- Fix linter: set immutable search_path on newly created function
CREATE OR REPLACE FUNCTION public.set_updated_at_pre_client_grants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;