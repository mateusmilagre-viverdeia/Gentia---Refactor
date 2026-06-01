-- Fase 11: Feriados automáticos (cadastro manual, aplicação automática no cálculo)

-- Table: company_holidays
CREATE TABLE IF NOT EXISTS public.company_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  holiday_date date NOT NULL,
  name text NOT NULL,
  notes text NULL,
  created_by uuid NULL,
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_holidays_account_date_unique UNIQUE (account_id, holiday_date)
);

CREATE INDEX IF NOT EXISTS idx_company_holidays_account_date
  ON public.company_holidays (account_id, holiday_date);

-- RLS
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;

-- Policies (multi-tenant: account-based)
-- Read for account members
CREATE POLICY "Account members can view company holidays"
ON public.company_holidays
FOR SELECT
USING (
  public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
);

-- Write for editors (Head CS/admin patterns)
CREATE POLICY "Account editors can insert company holidays"
ON public.company_holidays
FOR INSERT
WITH CHECK (
  public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
);

CREATE POLICY "Account editors can update company holidays"
ON public.company_holidays
FOR UPDATE
USING (
  public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
);

CREATE POLICY "Account editors can delete company holidays"
ON public.company_holidays
FOR DELETE
USING (
  public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_holidays_updated_at ON public.company_holidays;
CREATE TRIGGER trg_company_holidays_updated_at
BEFORE UPDATE ON public.company_holidays
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
