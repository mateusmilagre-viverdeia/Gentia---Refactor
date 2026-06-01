
-- FASE 1: Sistema Multi-Tenant com Convites de Equipe

-- 1. Criar enum para roles de conta
CREATE TYPE public.account_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- 2. Modificar tabela companies para funcionar como accounts
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending'));

-- Criar índice para slug
CREATE INDEX IF NOT EXISTS idx_companies_slug ON public.companies(slug);

-- 3. Criar tabela profiles (vinculada a auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  first_name text,
  last_name text,
  account_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para profiles
CREATE INDEX idx_profiles_account_id ON public.profiles(account_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- 4. Criar tabela account_members (memberships)
CREATE TABLE public.account_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role account_role NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(account_id, user_id)
);

-- Índices para account_members
CREATE INDEX idx_account_members_account_id ON public.account_members(account_id);
CREATE INDEX idx_account_members_user_id ON public.account_members(user_id);

-- 5. Criar tabela account_invites
CREATE TABLE public.account_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role account_role NOT NULL DEFAULT 'member',
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

-- Índices para account_invites
CREATE INDEX idx_account_invites_account_id ON public.account_invites(account_id);
CREATE INDEX idx_account_invites_email ON public.account_invites(email);

-- 6. Funções SECURITY DEFINER para evitar recursão RLS

-- Função para verificar se usuário é membro da conta
CREATE OR REPLACE FUNCTION public.is_account_member(_user_id uuid, _account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM account_members
    WHERE user_id = _user_id AND account_id = _account_id
  )
$$;

-- Função para obter role do usuário na conta
CREATE OR REPLACE FUNCTION public.get_account_role(_user_id uuid, _account_id uuid)
RETURNS account_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM account_members
  WHERE user_id = _user_id AND account_id = _account_id
  LIMIT 1
$$;

-- Função para verificar se usuário pode gerenciar conta (owner ou admin)
CREATE OR REPLACE FUNCTION public.can_manage_account(_user_id uuid, _account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM account_members
    WHERE user_id = _user_id 
    AND account_id = _account_id
    AND role IN ('owner', 'admin')
  )
$$;

-- Função para obter account_id do profile do usuário
CREATE OR REPLACE FUNCTION public.get_user_account_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_id FROM profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- 7. Trigger para criar profile automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

-- Criar trigger (drop primeiro se existir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_invites ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies para profiles
CREATE POLICY "Users can view profiles in same account"
ON public.profiles FOR SELECT
USING (
  public.is_account_member(auth.uid(), account_id)
  OR id = auth.uid()
);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- 10. RLS Policies para account_members
CREATE POLICY "Members can view account members"
ON public.account_members FOR SELECT
USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Admins can insert account members"
ON public.account_members FOR INSERT
WITH CHECK (public.can_manage_account(auth.uid(), account_id));

CREATE POLICY "Admins can update account members"
ON public.account_members FOR UPDATE
USING (public.can_manage_account(auth.uid(), account_id));

CREATE POLICY "Admins can delete account members"
ON public.account_members FOR DELETE
USING (
  public.can_manage_account(auth.uid(), account_id)
  AND user_id != auth.uid()
);

-- 11. RLS Policies para account_invites
CREATE POLICY "Admins can view account invites"
ON public.account_invites FOR SELECT
USING (public.can_manage_account(auth.uid(), account_id));

CREATE POLICY "Invited users can view their invites"
ON public.account_invites FOR SELECT
USING (
  email = (SELECT email FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins can create invites"
ON public.account_invites FOR INSERT
WITH CHECK (public.can_manage_account(auth.uid(), account_id));

CREATE POLICY "Invited users can update their invites"
ON public.account_invites FOR UPDATE
USING (
  email = (SELECT email FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins can delete invites"
ON public.account_invites FOR DELETE
USING (public.can_manage_account(auth.uid(), account_id));

-- 12. Atualizar RLS da tabela companies para usar novas funções
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
DROP POLICY IF EXISTS "Users can insert own company" ON public.companies;
DROP POLICY IF EXISTS "Users can update own company" ON public.companies;

CREATE POLICY "Members can view their account"
ON public.companies FOR SELECT
USING (
  public.is_account_member(auth.uid(), id)
  OR user_id = auth.uid()
);

CREATE POLICY "Users can create accounts"
ON public.companies FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update account"
ON public.companies FOR UPDATE
USING (public.can_manage_account(auth.uid(), id));

-- 13. Função para atualizar updated_at em profiles
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();
