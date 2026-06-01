-- =====================================================
-- CRIAR TABELA ep_consultants
-- =====================================================

CREATE TABLE public.ep_consultants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

ALTER TABLE public.ep_consultants ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CRIAR TABELA consultant_assignments
-- =====================================================

CREATE TABLE public.consultant_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES public.ep_consultants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(consultant_id, account_id)
);

ALTER TABLE public.consultant_assignments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CRIAR TABELA consultant_notes
-- =====================================================

CREATE TABLE public.consultant_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.consultant_notes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CRIAR TABELA project_checkpoints
-- =====================================================

CREATE TABLE public.project_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  checkpoint_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  topic TEXT NOT NULL,
  summary TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_checkpoints ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CRIAR TABELA checkpoint_actions
-- =====================================================

CREATE TABLE public.checkpoint_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id UUID NOT NULL REFERENCES public.project_checkpoints(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  responsible TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

ALTER TABLE public.checkpoint_actions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNÇÕES SECURITY DEFINER
-- =====================================================

-- Função: is_head_cs
CREATE OR REPLACE FUNCTION public.is_head_cs(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role = 'head_cs'
  )
$$;

-- Função: is_ep_consultant
CREATE OR REPLACE FUNCTION public.is_ep_consultant(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role = 'ep_consultant'
  )
$$;

-- Função: is_consultant_for_account
CREATE OR REPLACE FUNCTION public.is_consultant_for_account(_user_id UUID, _account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.consultant_assignments ca
    JOIN public.ep_consultants ec ON ec.id = ca.consultant_id
    WHERE ec.user_id = _user_id 
    AND ca.account_id = _account_id
    AND ca.active = true
    AND ec.active = true
  )
$$;

-- Função: can_edit_client_project
CREATE OR REPLACE FUNCTION public.can_edit_client_project(_user_id UUID, _account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_super_admin(_user_id)
    OR is_head_cs(_user_id)
    OR is_consultant_for_account(_user_id, _account_id)
$$;

-- Função: can_view_consultant_notes
CREATE OR REPLACE FUNCTION public.can_view_consultant_notes(_user_id UUID, _account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_super_admin(_user_id)
    OR is_head_cs(_user_id)
    OR is_consultant_for_account(_user_id, _account_id)
$$;

-- Função: can_manage_checkpoints
CREATE OR REPLACE FUNCTION public.can_manage_checkpoints(_user_id UUID, _account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_super_admin(_user_id)
    OR is_head_cs(_user_id)
    OR is_consultant_for_account(_user_id, _account_id)
$$;

-- Função: can_view_checkpoints
CREATE OR REPLACE FUNCTION public.can_view_checkpoints(_user_id UUID, _account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    can_manage_checkpoints(_user_id, _account_id)
    OR is_account_member(_user_id, _account_id)
$$;

-- Função: can_manage_consultants
CREATE OR REPLACE FUNCTION public.can_manage_consultants(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_super_admin(_user_id)
    OR is_head_cs(_user_id)
$$;

-- =====================================================
-- RLS POLICIES: ep_consultants
-- =====================================================

CREATE POLICY "Super Admin and Head CS can view all consultants"
ON public.ep_consultants FOR SELECT
USING (can_manage_consultants(auth.uid()));

CREATE POLICY "Super Admin and Head CS can create consultants"
ON public.ep_consultants FOR INSERT
WITH CHECK (can_manage_consultants(auth.uid()));

CREATE POLICY "Super Admin and Head CS can update consultants"
ON public.ep_consultants FOR UPDATE
USING (can_manage_consultants(auth.uid()));

CREATE POLICY "Super Admin and Head CS can delete consultants"
ON public.ep_consultants FOR DELETE
USING (can_manage_consultants(auth.uid()));

CREATE POLICY "Consultants can view themselves"
ON public.ep_consultants FOR SELECT
USING (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES: consultant_assignments
-- =====================================================

CREATE POLICY "Super Admin and Head CS can view all assignments"
ON public.consultant_assignments FOR SELECT
USING (can_manage_consultants(auth.uid()));

CREATE POLICY "Super Admin and Head CS can create assignments"
ON public.consultant_assignments FOR INSERT
WITH CHECK (can_manage_consultants(auth.uid()));

CREATE POLICY "Super Admin and Head CS can update assignments"
ON public.consultant_assignments FOR UPDATE
USING (can_manage_consultants(auth.uid()));

CREATE POLICY "Super Admin and Head CS can delete assignments"
ON public.consultant_assignments FOR DELETE
USING (can_manage_consultants(auth.uid()));

CREATE POLICY "Consultants can view their own assignments"
ON public.consultant_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ep_consultants ec
    WHERE ec.id = consultant_assignments.consultant_id
    AND ec.user_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES: consultant_notes
-- =====================================================

CREATE POLICY "EP Team can view consultant notes"
ON public.consultant_notes FOR SELECT
USING (can_view_consultant_notes(auth.uid(), account_id));

CREATE POLICY "EP Team can create consultant notes"
ON public.consultant_notes FOR INSERT
WITH CHECK (can_view_consultant_notes(auth.uid(), account_id));

CREATE POLICY "EP Team can update consultant notes"
ON public.consultant_notes FOR UPDATE
USING (can_view_consultant_notes(auth.uid(), account_id));

CREATE POLICY "EP Team can delete consultant notes"
ON public.consultant_notes FOR DELETE
USING (can_view_consultant_notes(auth.uid(), account_id));

-- =====================================================
-- RLS POLICIES: project_checkpoints
-- =====================================================

CREATE POLICY "Users can view checkpoints"
ON public.project_checkpoints FOR SELECT
USING (can_view_checkpoints(auth.uid(), account_id));

CREATE POLICY "EP Team can create checkpoints"
ON public.project_checkpoints FOR INSERT
WITH CHECK (can_manage_checkpoints(auth.uid(), account_id));

CREATE POLICY "EP Team can update checkpoints"
ON public.project_checkpoints FOR UPDATE
USING (can_manage_checkpoints(auth.uid(), account_id));

CREATE POLICY "EP Team can delete checkpoints"
ON public.project_checkpoints FOR DELETE
USING (can_manage_checkpoints(auth.uid(), account_id));

-- =====================================================
-- RLS POLICIES: checkpoint_actions
-- =====================================================

CREATE POLICY "Users can view checkpoint actions"
ON public.checkpoint_actions FOR SELECT
USING (can_view_checkpoints(auth.uid(), account_id));

CREATE POLICY "EP Team can create checkpoint actions"
ON public.checkpoint_actions FOR INSERT
WITH CHECK (can_manage_checkpoints(auth.uid(), account_id));

CREATE POLICY "EP Team can update checkpoint actions"
ON public.checkpoint_actions FOR UPDATE
USING (can_manage_checkpoints(auth.uid(), account_id));

CREATE POLICY "EP Team can delete checkpoint actions"
ON public.checkpoint_actions FOR DELETE
USING (can_manage_checkpoints(auth.uid(), account_id));

-- =====================================================
-- TRIGGERS para updated_at
-- =====================================================

CREATE TRIGGER update_consultant_notes_updated_at
BEFORE UPDATE ON public.consultant_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_checkpoints_updated_at
BEFORE UPDATE ON public.project_checkpoints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checkpoint_actions_updated_at
BEFORE UPDATE ON public.checkpoint_actions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();