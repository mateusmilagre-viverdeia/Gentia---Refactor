-- Phase 11: Disponibilidade (bloqueios de capacidade)

-- 1) Enum (opcional) para tipo de bloqueio
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'availability_block_type') THEN
    CREATE TYPE public.availability_block_type AS ENUM (
      'vacation',
      'holiday',
      'training',
      'sick',
      'offsite',
      'other'
    );
  END IF;
END $$;

-- 2) Tabela de bloqueios
CREATE TABLE IF NOT EXISTS public.consultant_availability_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id uuid NOT NULL REFERENCES public.ep_consultants(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  block_type public.availability_block_type NOT NULL DEFAULT 'vacation',
  hours_per_day integer NULL,
  notes text NULL,
  created_by uuid NULL,
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultant_availability_blocks_consultant_idx
  ON public.consultant_availability_blocks (consultant_id);

CREATE INDEX IF NOT EXISTS consultant_availability_blocks_date_idx
  ON public.consultant_availability_blocks (start_date, end_date);

ALTER TABLE public.consultant_availability_blocks ENABLE ROW LEVEL SECURITY;

-- 3) Validação de datas via trigger (evitar CHECK com now() etc.)
CREATE OR REPLACE FUNCTION public.validate_consultant_availability_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'end_date must be >= start_date';
  END IF;

  IF NEW.hours_per_day IS NOT NULL AND NEW.hours_per_day < 0 THEN
    RAISE EXCEPTION 'hours_per_day must be >= 0';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'validate_consultant_availability_blocks'
  ) THEN
    CREATE TRIGGER validate_consultant_availability_blocks
    BEFORE INSERT OR UPDATE ON public.consultant_availability_blocks
    FOR EACH ROW EXECUTE FUNCTION public.validate_consultant_availability_block();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_consultant_availability_blocks_updated_at'
  ) THEN
    CREATE TRIGGER update_consultant_availability_blocks_updated_at
    BEFORE UPDATE ON public.consultant_availability_blocks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 4) RLS: EP team lê; Head CS/Super Admin gerenciam
DROP POLICY IF EXISTS "EP team can read consultant availability blocks" ON public.consultant_availability_blocks;
CREATE POLICY "EP team can read consultant availability blocks"
ON public.consultant_availability_blocks
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'head_cs')
  OR public.has_role(auth.uid(), 'ep_consultant')
  OR public.has_role(auth.uid(), 'ep_partner')
);

DROP POLICY IF EXISTS "Head CS can insert consultant availability blocks" ON public.consultant_availability_blocks;
CREATE POLICY "Head CS can insert consultant availability blocks"
ON public.consultant_availability_blocks
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'head_cs'));

DROP POLICY IF EXISTS "Head CS can update consultant availability blocks" ON public.consultant_availability_blocks;
CREATE POLICY "Head CS can update consultant availability blocks"
ON public.consultant_availability_blocks
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'head_cs'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'head_cs'));

DROP POLICY IF EXISTS "Head CS can delete consultant availability blocks" ON public.consultant_availability_blocks;
CREATE POLICY "Head CS can delete consultant availability blocks"
ON public.consultant_availability_blocks
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'head_cs'));
