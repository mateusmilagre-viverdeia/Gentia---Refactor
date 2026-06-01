
-- 1. Add updated_by and update_source columns
ALTER TABLE public.recruitment_applications
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS update_source text;

-- 2. Create audit history table
CREATE TABLE IF NOT EXISTS public.recruitment_applications_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  account_id uuid NOT NULL,
  candidate_id uuid,
  job_id uuid,
  old_status text,
  new_status text,
  old_stage_id uuid,
  new_stage_id uuid,
  old_step_type text,
  new_step_type text,
  changed_by uuid,
  change_source text,
  changed_fields text[],
  full_old_row jsonb,
  full_new_row jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recr_apps_history_app ON public.recruitment_applications_history(application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recr_apps_history_account ON public.recruitment_applications_history(account_id, created_at DESC);

ALTER TABLE public.recruitment_applications_history ENABLE ROW LEVEL SECURITY;

-- Read policy: account members or consultants with access
DROP POLICY IF EXISTS "history_select" ON public.recruitment_applications_history;
CREATE POLICY "history_select"
ON public.recruitment_applications_history
FOR SELECT
TO authenticated
USING (
  public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
);

-- No insert/update/delete from clients — only trigger (security definer) writes here.
-- We intentionally do NOT create INSERT/UPDATE/DELETE policies, so RLS blocks all client writes.

-- 3. Trigger function
CREATE OR REPLACE FUNCTION public.log_recruitment_application_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_source text;
  v_changed text[] := ARRAY[]::text[];
BEGIN
  -- Detect actor: prefer explicit NEW.updated_by, else auth.uid()
  v_actor := COALESCE(NEW.updated_by, auth.uid());
  v_source := COALESCE(NEW.update_source,
    CASE WHEN auth.uid() IS NULL THEN 'system/service_role' ELSE 'user_app' END);

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_changed := array_append(v_changed, 'status');
  END IF;
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    v_changed := array_append(v_changed, 'stage_id');
  END IF;
  IF (to_jsonb(NEW) ? 'current_step_type')
     AND (to_jsonb(NEW) ->> 'current_step_type') IS DISTINCT FROM (to_jsonb(OLD) ->> 'current_step_type') THEN
    v_changed := array_append(v_changed, 'current_step_type');
  END IF;

  -- Only log meaningful changes
  IF array_length(v_changed, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.recruitment_applications_history (
    application_id, account_id, candidate_id, job_id,
    old_status, new_status,
    old_stage_id, new_stage_id,
    old_step_type, new_step_type,
    changed_by, change_source, changed_fields,
    full_old_row, full_new_row
  ) VALUES (
    NEW.id, NEW.account_id, NEW.candidate_id, NEW.job_id,
    OLD.status, NEW.status,
    OLD.stage_id, NEW.stage_id,
    (to_jsonb(OLD) ->> 'current_step_type'), (to_jsonb(NEW) ->> 'current_step_type'),
    v_actor, v_source, v_changed,
    to_jsonb(OLD), to_jsonb(NEW)
  );

  RETURN NEW;
END;
$$;

-- 4. Attach trigger
DROP TRIGGER IF EXISTS trg_log_recruitment_application_changes ON public.recruitment_applications;
CREATE TRIGGER trg_log_recruitment_application_changes
AFTER UPDATE ON public.recruitment_applications
FOR EACH ROW
EXECUTE FUNCTION public.log_recruitment_application_changes();
