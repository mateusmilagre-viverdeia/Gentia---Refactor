-- =============================================
-- INTRANET CORPORATIVA - Estrutura de Dados
-- =============================================

-- 1. Tabela de Colaboradores
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  birth_date DATE,
  hire_date DATE,
  job_title TEXT,
  department TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabela de Eventos Organizacionais
CREATE TABLE public.org_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'company_event' CHECK (event_type IN ('holiday', 'company_event', 'training', 'celebration')),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Tabela de Posts da Intranet
CREATE TABLE public.intranet_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL DEFAULT 'custom' CHECK (post_type IN ('announcement', 'birthday', 'new_hire', 'promotion', 'holiday', 'custom')),
  title TEXT NOT NULL,
  content TEXT,
  media_url TEXT,
  related_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  related_event_id UUID REFERENCES public.org_events(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- RLS Policies
-- =============================================

-- Employees RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view employees of their organization"
  ON public.employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = employees.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
    )
  );

CREATE POLICY "Admins can insert employees"
  ON public.employees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = employees.account_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin')
      AND am.is_active = true
    )
  );

CREATE POLICY "Admins can update employees"
  ON public.employees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = employees.account_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin')
      AND am.is_active = true
    )
  );

CREATE POLICY "Admins can delete employees"
  ON public.employees FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = employees.account_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin')
      AND am.is_active = true
    )
  );

-- Org Events RLS
ALTER TABLE public.org_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org events"
  ON public.org_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = org_events.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
    )
  );

CREATE POLICY "Admins can insert org events"
  ON public.org_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = org_events.account_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin')
      AND am.is_active = true
    )
  );

CREATE POLICY "Admins can update org events"
  ON public.org_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = org_events.account_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin')
      AND am.is_active = true
    )
  );

CREATE POLICY "Admins can delete org events"
  ON public.org_events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = org_events.account_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin')
      AND am.is_active = true
    )
  );

-- Intranet Posts RLS
ALTER TABLE public.intranet_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view intranet posts"
  ON public.intranet_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = intranet_posts.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
    )
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "Admins can insert intranet posts"
  ON public.intranet_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = intranet_posts.account_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin')
      AND am.is_active = true
    )
  );

CREATE POLICY "Admins can update intranet posts"
  ON public.intranet_posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = intranet_posts.account_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin')
      AND am.is_active = true
    )
  );

CREATE POLICY "Admins can delete intranet posts"
  ON public.intranet_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = intranet_posts.account_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin')
      AND am.is_active = true
    )
  );

-- =============================================
-- Indexes for performance
-- =============================================
CREATE INDEX idx_employees_account_id ON public.employees(account_id);
CREATE INDEX idx_employees_birth_date ON public.employees(birth_date);
CREATE INDEX idx_employees_hire_date ON public.employees(hire_date);
CREATE INDEX idx_org_events_account_id ON public.org_events(account_id);
CREATE INDEX idx_org_events_event_date ON public.org_events(event_date);
CREATE INDEX idx_intranet_posts_account_id ON public.intranet_posts(account_id);
CREATE INDEX idx_intranet_posts_published_at ON public.intranet_posts(published_at DESC);
CREATE INDEX idx_intranet_posts_post_type ON public.intranet_posts(post_type);

-- =============================================
-- Trigger for updated_at
-- =============================================
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Enable Realtime for intranet_posts
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.intranet_posts;