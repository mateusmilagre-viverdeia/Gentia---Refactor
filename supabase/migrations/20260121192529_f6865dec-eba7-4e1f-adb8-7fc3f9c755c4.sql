-- Phase 10: Resource Planning (Planejamento de Recursos)

-- 1) Consultant capacity settings
CREATE TABLE IF NOT EXISTS public.consultant_capacity_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id uuid NOT NULL UNIQUE REFERENCES public.ep_consultants(id) ON DELETE CASCADE,
  weekly_hours integer NOT NULL DEFAULT 40,
  max_projects integer NOT NULL DEFAULT 5,
  available_from date NOT NULL DEFAULT current_date,
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consultant_capacity_settings ENABLE ROW LEVEL SECURITY;

-- 2) Project weekly demand requirements
CREATE TABLE IF NOT EXISTS public.project_resource_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  estimated_hours numeric NOT NULL DEFAULT 0,
  priority integer NOT NULL DEFAULT 2,
  confidence integer NULL,
  notes text NULL,
  created_by uuid NULL,
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_resource_requirements_priority_chk CHECK (priority IN (1,2,3)),
  CONSTRAINT project_resource_requirements_confidence_chk CHECK (confidence IS NULL OR confidence BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX IF NOT EXISTS project_resource_requirements_account_week_ux
  ON public.project_resource_requirements (account_id, week_start);

CREATE INDEX IF NOT EXISTS project_resource_requirements_week_idx
  ON public.project_resource_requirements (week_start);

ALTER TABLE public.project_resource_requirements ENABLE ROW LEVEL SECURITY;

-- 3) Snapshots/versioning
CREATE TABLE IF NOT EXISTS public.resource_allocation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  horizon_weeks integer NOT NULL DEFAULT 12,
  label text NULL,
  snapshot jsonb NOT NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resource_allocation_history_week_idx
  ON public.resource_allocation_history (week_start);

ALTER TABLE public.resource_allocation_history ENABLE ROW LEVEL SECURITY;

-- updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_consultant_capacity_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_consultant_capacity_settings_updated_at
    BEFORE UPDATE ON public.consultant_capacity_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_project_resource_requirements_updated_at'
  ) THEN
    CREATE TRIGGER update_project_resource_requirements_updated_at
    BEFORE UPDATE ON public.project_resource_requirements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- RLS Policies (Head CS + Super Admin manage; EP team can read)

-- consultant_capacity_settings
DROP POLICY IF EXISTS "EP team can read consultant capacity settings" ON public.consultant_capacity_settings;
CREATE POLICY "EP team can read consultant capacity settings"
ON public.consultant_capacity_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'head_cs') OR public.has_role(auth.uid(), 'ep_consultant') OR public.has_role(auth.uid(), 'ep_partner'));

DROP POLICY IF EXISTS "Head CS can manage consultant capacity settings" ON public.consultant_capacity_settings;
CREATE POLICY "Head CS can manage consultant capacity settings"
ON public.consultant_capacity_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'head_cs'));

DROP POLICY IF EXISTS "Head CS can update consultant capacity settings" ON public.consultant_capacity_settings;
CREATE POLICY "Head CS can update consultant capacity settings"
ON public.consultant_capacity_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'head_cs'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'head_cs'));

DROP POLICY IF EXISTS "Head CS can delete consultant capacity settings" ON public.consultant_capacity_settings;
CREATE POLICY "Head CS can delete consultant capacity settings"
ON public.consultant_capacity_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'head_cs'));

-- project_resource_requirements
DROP POLICY IF EXISTS "EP team can read project resource requirements" ON public.project_resource_requirements;
CREATE POLICY "EP team can read project resource requirements"
ON public.project_resource_requirements
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'head_cs') OR public.has_role(auth.uid(), 'ep_consultant') OR public.has_role(auth.uid(), 'ep_partner'));

DROP POLICY IF EXISTS "Head CS can insert project resource requirements" ON public.project_resource_requirements;
CREATE POLICY "Head CS can insert project resource requirements"
ON public.project_resource_requirements
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'head_cs'));

DROP POLICY IF EXISTS "Head CS can update project resource requirements" ON public.project_resource_requirements;
CREATE POLICY "Head CS can update project resource requirements"
ON public.project_resource_requirements
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'head_cs'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'head_cs'));

DROP POLICY IF EXISTS "Head CS can delete project resource requirements" ON public.project_resource_requirements;
CREATE POLICY "Head CS can delete project resource requirements"
ON public.project_resource_requirements
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'head_cs'));

-- resource_allocation_history
DROP POLICY IF EXISTS "EP team can read resource allocation snapshots" ON public.resource_allocation_history;
CREATE POLICY "EP team can read resource allocation snapshots"
ON public.resource_allocation_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'head_cs') OR public.has_role(auth.uid(), 'ep_consultant') OR public.has_role(auth.uid(), 'ep_partner'));

DROP POLICY IF EXISTS "Head CS can create resource allocation snapshots" ON public.resource_allocation_history;
CREATE POLICY "Head CS can create resource allocation snapshots"
ON public.resource_allocation_history
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'head_cs'));

DROP POLICY IF EXISTS "Head CS can delete resource allocation snapshots" ON public.resource_allocation_history;
CREATE POLICY "Head CS can delete resource allocation snapshots"
ON public.resource_allocation_history
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'head_cs'));
