CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

CREATE OR REPLACE FUNCTION public.generate_intake_slug(p_account_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_base_slug TEXT;
  v_final_slug TEXT;
  v_counter INT := 0;
  v_company_name TEXT;
BEGIN
  SELECT COALESCE(slug, name) INTO v_company_name
  FROM public.companies
  WHERE id = p_account_id;

  v_base_slug := lower(regexp_replace(public.unaccent(COALESCE(v_company_name, 'conta')), '[^a-z0-9]+', '-', 'gi'));
  v_base_slug := trim(both '-' from v_base_slug);
  v_base_slug := substring(v_base_slug from 1 for 30);

  IF v_base_slug = '' OR v_base_slug IS NULL THEN
    v_base_slug := 'conta-' || substr(p_account_id::text, 1, 8);
  END IF;

  v_final_slug := v_base_slug;

  WHILE EXISTS (SELECT 1 FROM public.email_intake_config WHERE slug = v_final_slug) LOOP
    v_counter := v_counter + 1;
    v_final_slug := v_base_slug || '-' || v_counter::text;
  END LOOP;

  RETURN v_final_slug;
END;
$function$;