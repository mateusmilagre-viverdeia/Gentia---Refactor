-- Create table for multiple users per EP Partner
CREATE TABLE public.ep_partner_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.ep_partners(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'viewer')),
    invited_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(partner_id, user_id)
);

-- Enable RLS
ALTER TABLE public.ep_partner_users ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is a partner user
CREATE OR REPLACE FUNCTION public.is_ep_partner_user(_user_id UUID, _partner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ep_partner_users
    WHERE user_id = _user_id
      AND partner_id = _partner_id
  )
$$;

-- Function to get partner ID for a user (checks both old user_id and new ep_partner_users)
CREATE OR REPLACE FUNCTION public.get_user_partner_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT partner_id FROM public.ep_partner_users WHERE user_id = _user_id LIMIT 1),
    (SELECT id FROM public.ep_partners WHERE user_id = _user_id AND active = true LIMIT 1)
  )
$$;

-- Function to check partner user role
CREATE OR REPLACE FUNCTION public.get_ep_partner_user_role(_user_id UUID, _partner_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.ep_partner_users WHERE user_id = _user_id AND partner_id = _partner_id),
    CASE WHEN EXISTS (SELECT 1 FROM public.ep_partners WHERE user_id = _user_id AND id = _partner_id) THEN 'owner' ELSE NULL END
  )
$$;

-- RLS Policies for ep_partner_users

-- Super admins can do everything
CREATE POLICY "Super admins can manage all partner users"
ON public.ep_partner_users
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Partner owners can view and manage their partner's users
CREATE POLICY "Partner owners can view their users"
ON public.ep_partner_users
FOR SELECT
TO authenticated
USING (
  partner_id IN (
    SELECT id FROM public.ep_partners WHERE user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Partner owners can insert users"
ON public.ep_partner_users
FOR INSERT
TO authenticated
WITH CHECK (
  partner_id IN (
    SELECT id FROM public.ep_partners WHERE user_id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Partner owners can delete users"
ON public.ep_partner_users
FOR DELETE
TO authenticated
USING (
  partner_id IN (
    SELECT id FROM public.ep_partners WHERE user_id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

-- Migrate existing partners: insert current user_id as owner in ep_partner_users
INSERT INTO public.ep_partner_users (partner_id, user_id, role, invited_by)
SELECT id, user_id, 'owner', created_by
FROM public.ep_partners
WHERE user_id IS NOT NULL AND active = true
ON CONFLICT (partner_id, user_id) DO NOTHING;