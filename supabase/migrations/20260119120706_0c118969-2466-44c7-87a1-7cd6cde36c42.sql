-- Phase 2: Fix mutable search_path in trigger functions

-- 1. Fix update_offboarding_updated_at
CREATE OR REPLACE FUNCTION public.update_offboarding_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 2. Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;