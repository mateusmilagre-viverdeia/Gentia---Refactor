-- Fase 1: Workflow por vaga (steps + thresholds)

-- Table to store ordered workflow steps for each recruitment job
CREATE TABLE IF NOT EXISTS public.recruitment_job_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  job_id UUID NOT NULL,
  step_type TEXT NOT NULL,
  agent_id UUID NULL,
  position INTEGER NOT NULL DEFAULT 0,
  threshold_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_rjws_job_position ON public.recruitment_job_workflow_steps (job_id, position);
CREATE INDEX IF NOT EXISTS idx_rjws_account_job ON public.recruitment_job_workflow_steps (account_id, job_id);

-- Foreign keys (best-effort; only add if referenced tables exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'recruitment_jobs'
  ) THEN
    ALTER TABLE public.recruitment_job_workflow_steps
      ADD CONSTRAINT rjws_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES public.recruitment_jobs(id)
      ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- ignore
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'recruitment_agents'
  ) THEN
    ALTER TABLE public.recruitment_job_workflow_steps
      ADD CONSTRAINT rjws_agent_id_fkey
      FOREIGN KEY (agent_id) REFERENCES public.recruitment_agents(id)
      ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- ignore
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) THEN
    ALTER TABLE public.recruitment_job_workflow_steps
      ADD CONSTRAINT rjws_account_id_fkey
      FOREIGN KEY (account_id) REFERENCES public.companies(id)
      ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- ignore
END $$;

-- RLS
ALTER TABLE public.recruitment_job_workflow_steps ENABLE ROW LEVEL SECURITY;

-- Read access for account members (team-based)
DO $$
BEGIN
  CREATE POLICY "rjws_select_account"
  ON public.recruitment_job_workflow_steps
  FOR SELECT
  USING (
    is_account_member(auth.uid(), account_id)
    OR can_edit_client_project(auth.uid(), account_id)
  );
EXCEPTION WHEN duplicate_object THEN
END $$;

-- Write access for account members (kept permissive; UI should gate by role)
DO $$
BEGIN
  CREATE POLICY "rjws_insert_account"
  ON public.recruitment_job_workflow_steps
  FOR INSERT
  WITH CHECK (
    is_account_member(auth.uid(), account_id)
    OR can_edit_client_project(auth.uid(), account_id)
  );
EXCEPTION WHEN duplicate_object THEN
END $$;

DO $$
BEGIN
  CREATE POLICY "rjws_update_account"
  ON public.recruitment_job_workflow_steps
  FOR UPDATE
  USING (
    is_account_member(auth.uid(), account_id)
    OR can_edit_client_project(auth.uid(), account_id)
  )
  WITH CHECK (
    is_account_member(auth.uid(), account_id)
    OR can_edit_client_project(auth.uid(), account_id)
  );
EXCEPTION WHEN duplicate_object THEN
END $$;

DO $$
BEGIN
  CREATE POLICY "rjws_delete_account"
  ON public.recruitment_job_workflow_steps
  FOR DELETE
  USING (
    is_account_member(auth.uid(), account_id)
    OR can_edit_client_project(auth.uid(), account_id)
  );
EXCEPTION WHEN duplicate_object THEN
END $$;

-- updated_at trigger (assumes public.update_updated_at_column already exists in project)
DO $$
BEGIN
  CREATE TRIGGER update_recruitment_job_workflow_steps_updated_at
  BEFORE UPDATE ON public.recruitment_job_workflow_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN
END $$;