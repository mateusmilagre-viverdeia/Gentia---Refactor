-- Add normalized CNPJ digits to companies for reliable matching
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS cnpj_digits text;

-- Backfill existing rows
UPDATE public.companies
SET cnpj_digits = regexp_replace(coalesce(cnpj, ''), '[^0-9]', '', 'g')
WHERE cnpj_digits IS NULL;

-- Keep cnpj_digits synced
CREATE OR REPLACE FUNCTION public.set_company_cnpj_digits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.cnpj_digits := regexp_replace(coalesce(NEW.cnpj, ''), '[^0-9]', '', 'g');
  IF NEW.cnpj_digits = '' THEN
    NEW.cnpj_digits := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_company_cnpj_digits ON public.companies;
CREATE TRIGGER trg_set_company_cnpj_digits
BEFORE INSERT OR UPDATE OF cnpj ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.set_company_cnpj_digits();

CREATE INDEX IF NOT EXISTS idx_companies_cnpj_digits ON public.companies(cnpj_digits);
