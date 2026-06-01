-- 1) Comments for client portal (milestones/checkpoints)
CREATE TABLE IF NOT EXISTS public.project_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL,
  parent_id UUID NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT project_comments_entity_type_chk
    CHECK (entity_type IN ('milestone', 'checkpoint')),

  CONSTRAINT project_comments_parent_fk
    FOREIGN KEY (parent_id) REFERENCES public.project_comments(id) ON DELETE CASCADE,

  CONSTRAINT project_comments_company_fk
    FOREIGN KEY (account_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_comments_account_entity
  ON public.project_comments(account_id, entity_type, entity_id, created_at);

CREATE INDEX IF NOT EXISTS idx_project_comments_parent
  ON public.project_comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_project_comments_user
  ON public.project_comments(user_id);

-- 2) updated_at trigger helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_project_comments_updated_at ON public.project_comments;
CREATE TRIGGER update_project_comments_updated_at
BEFORE UPDATE ON public.project_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3) RLS
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

-- Read: account members OR delegated consultant access
DROP POLICY IF EXISTS "Project comments are readable by account" ON public.project_comments;
CREATE POLICY "Project comments are readable by account"
ON public.project_comments
FOR SELECT
USING (
  public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
);

-- Insert: account members OR delegated consultant access
DROP POLICY IF EXISTS "Project comments can be created by account" ON public.project_comments;
CREATE POLICY "Project comments can be created by account"
ON public.project_comments
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.is_account_member(auth.uid(), account_id)
    OR public.can_edit_client_project(auth.uid(), account_id)
  )
);

-- Update: only author (account member/delegate), to keep it safe
DROP POLICY IF EXISTS "Project comments can be updated by author" ON public.project_comments;
CREATE POLICY "Project comments can be updated by author"
ON public.project_comments
FOR UPDATE
USING (
  user_id = auth.uid()
  AND (
    public.is_account_member(auth.uid(), account_id)
    OR public.can_edit_client_project(auth.uid(), account_id)
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.is_account_member(auth.uid(), account_id)
    OR public.can_edit_client_project(auth.uid(), account_id)
  )
);

-- Delete: only author (account member/delegate)
DROP POLICY IF EXISTS "Project comments can be deleted by author" ON public.project_comments;
CREATE POLICY "Project comments can be deleted by author"
ON public.project_comments
FOR DELETE
USING (
  user_id = auth.uid()
  AND (
    public.is_account_member(auth.uid(), account_id)
    OR public.can_edit_client_project(auth.uid(), account_id)
  )
);
