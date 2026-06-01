-- Unified version history table
CREATE TABLE public.module_version_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  module_key text NOT NULL,
  entity_id uuid,
  snapshot jsonb NOT NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  trigger_type text NOT NULL DEFAULT 'manual',
  label text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mvh_lookup ON public.module_version_history (account_id, module_key, entity_id, created_at DESC);
CREATE INDEX idx_mvh_module ON public.module_version_history (account_id, module_key, created_at DESC);

ALTER TABLE public.module_version_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view module versions"
  ON public.module_version_history FOR SELECT
  USING (
    public.is_account_member(auth.uid(), account_id)
    OR public.can_edit_client_project(auth.uid(), account_id)
  );

CREATE POLICY "Members can insert module versions"
  ON public.module_version_history FOR INSERT
  WITH CHECK (
    (public.is_account_member(auth.uid(), account_id)
     OR public.can_edit_client_project(auth.uid(), account_id))
    AND created_by = auth.uid()
  );

CREATE POLICY "Members can delete module versions"
  ON public.module_version_history FOR DELETE
  USING (
    public.is_account_member(auth.uid(), account_id)
    OR public.can_edit_client_project(auth.uid(), account_id)
  );

-- Retention: keep only the 50 most recent per (account, module, entity)
CREATE OR REPLACE FUNCTION public.enforce_module_version_retention()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.module_version_history
  WHERE id IN (
    SELECT id FROM public.module_version_history
    WHERE account_id = NEW.account_id
      AND module_key = NEW.module_key
      AND entity_id IS NOT DISTINCT FROM NEW.entity_id
    ORDER BY created_at DESC
    OFFSET 50
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mvh_retention
  AFTER INSERT ON public.module_version_history
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_module_version_retention();