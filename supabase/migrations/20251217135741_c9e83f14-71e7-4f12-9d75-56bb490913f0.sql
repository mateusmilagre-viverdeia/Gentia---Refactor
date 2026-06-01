-- Create ep_invites table for EP team member invitations
CREATE TABLE public.ep_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ep_consultant', 'head_cs')),
  invited_by UUID NOT NULL,
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

-- Enable RLS
ALTER TABLE public.ep_invites ENABLE ROW LEVEL SECURITY;

-- Super admins and head_cs can view all invites
CREATE POLICY "EP managers can view all invites"
ON public.ep_invites FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid()) 
  OR public.is_head_cs(auth.uid())
);

-- Super admins and head_cs can create invites
CREATE POLICY "EP managers can create invites"
ON public.ep_invites FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid()) 
  OR public.is_head_cs(auth.uid())
);

-- Super admins and head_cs can update invites
CREATE POLICY "EP managers can update invites"
ON public.ep_invites FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid()) 
  OR public.is_head_cs(auth.uid())
);

-- Allow unauthenticated to view valid pending invites (for accept flow)
CREATE POLICY "Anyone can view valid pending invites"
ON public.ep_invites FOR SELECT
TO anon
USING (accepted = false AND expires_at > now());