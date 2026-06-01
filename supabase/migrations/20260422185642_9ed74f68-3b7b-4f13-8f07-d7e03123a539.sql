CREATE TABLE IF NOT EXISTS public.post_hire_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.recruitment_applications(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes_consultoria(id) ON DELETE SET NULL,
  onboarding_process_id uuid REFERENCES public.onboarding_processes(id) ON DELETE SET NULL,
  hired_at date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active',
  owner_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id)
);

CREATE TABLE IF NOT EXISTS public.post_hire_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.post_hire_checklists(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  title text NOT NULL,
  description text,
  responsible_type text NOT NULL DEFAULT 'agency',
  due_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  completed_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (checklist_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_post_hire_checklists_account ON public.post_hire_checklists(account_id);
CREATE INDEX IF NOT EXISTS idx_post_hire_checklists_job ON public.post_hire_checklists(job_id);
CREATE INDEX IF NOT EXISTS idx_post_hire_checklists_cliente ON public.post_hire_checklists(cliente_id);
CREATE INDEX IF NOT EXISTS idx_post_hire_items_checklist ON public.post_hire_checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_post_hire_items_account_status ON public.post_hire_checklist_items(account_id, status);

ALTER TABLE public.post_hire_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_hire_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view post hire checklists"
ON public.post_hire_checklists
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = post_hire_checklists.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.companies employer
    WHERE employer.user_id = auth.uid()
      AND employer.account_type = 'employer'
      AND employer.employer_linked_agency_id = post_hire_checklists.account_id
      AND employer.employer_linked_client_id = post_hire_checklists.cliente_id
  )
);

CREATE POLICY "Account members can create post hire checklists"
ON public.post_hire_checklists
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = post_hire_checklists.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
);

CREATE POLICY "Account members can update post hire checklists"
ON public.post_hire_checklists
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = post_hire_checklists.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = post_hire_checklists.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
);

CREATE POLICY "Account members can delete post hire checklists"
ON public.post_hire_checklists
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = post_hire_checklists.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
);

CREATE POLICY "Authorized users can view post hire checklist items"
ON public.post_hire_checklist_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.post_hire_checklists phc
    WHERE phc.id = post_hire_checklist_items.checklist_id
      AND (
        EXISTS (
          SELECT 1 FROM public.account_members am
          WHERE am.account_id = phc.account_id
            AND am.user_id = auth.uid()
            AND am.is_active = true
        )
        OR EXISTS (
          SELECT 1 FROM public.companies employer
          WHERE employer.user_id = auth.uid()
            AND employer.account_type = 'employer'
            AND employer.employer_linked_agency_id = phc.account_id
            AND employer.employer_linked_client_id = phc.cliente_id
        )
      )
  )
);

CREATE POLICY "Account members can create post hire checklist items"
ON public.post_hire_checklist_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = post_hire_checklist_items.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
);

CREATE POLICY "Account members can update post hire checklist items"
ON public.post_hire_checklist_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = post_hire_checklist_items.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = post_hire_checklist_items.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
);

CREATE POLICY "Account members can delete post hire checklist items"
ON public.post_hire_checklist_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = post_hire_checklist_items.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
);

CREATE TRIGGER update_post_hire_checklists_updated_at
BEFORE UPDATE ON public.post_hire_checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_post_hire_checklist_items_updated_at
BEFORE UPDATE ON public.post_hire_checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();