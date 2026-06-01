-- Create people_analyses table (main analysis container, like hiring_funnels)
CREATE TABLE public.people_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  values_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create people_analysis_members table (people being evaluated)
CREATE TABLE public.people_analysis_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.people_analyses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create people_analysis_ratings table (traffic light ratings)
CREATE TABLE public.people_analysis_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.people_analysis_members(id) ON DELETE CASCADE,
  value_label TEXT NOT NULL,
  score NUMERIC(2,1) NOT NULL CHECK (score IN (0, 0.5, 1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id, value_label)
);

-- Enable RLS on all tables
ALTER TABLE public.people_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_analysis_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_analysis_ratings ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is admin or owner of account
CREATE OR REPLACE FUNCTION public.is_account_admin_or_owner(_user_id uuid, _account_id uuid)
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

-- RLS Policies for people_analyses (only owner/admin can access)
CREATE POLICY "Admins can view account analyses"
ON public.people_analyses FOR SELECT
USING (is_account_admin_or_owner(auth.uid(), account_id));

CREATE POLICY "Admins can create account analyses"
ON public.people_analyses FOR INSERT
WITH CHECK (is_account_admin_or_owner(auth.uid(), account_id));

CREATE POLICY "Admins can update account analyses"
ON public.people_analyses FOR UPDATE
USING (is_account_admin_or_owner(auth.uid(), account_id));

CREATE POLICY "Admins can delete account analyses"
ON public.people_analyses FOR DELETE
USING (is_account_admin_or_owner(auth.uid(), account_id));

-- RLS Policies for people_analysis_members
CREATE POLICY "Admins can view analysis members"
ON public.people_analysis_members FOR SELECT
USING (EXISTS (
  SELECT 1 FROM people_analyses pa
  WHERE pa.id = people_analysis_members.analysis_id
  AND is_account_admin_or_owner(auth.uid(), pa.account_id)
));

CREATE POLICY "Admins can create analysis members"
ON public.people_analysis_members FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM people_analyses pa
  WHERE pa.id = people_analysis_members.analysis_id
  AND is_account_admin_or_owner(auth.uid(), pa.account_id)
));

CREATE POLICY "Admins can update analysis members"
ON public.people_analysis_members FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM people_analyses pa
  WHERE pa.id = people_analysis_members.analysis_id
  AND is_account_admin_or_owner(auth.uid(), pa.account_id)
));

CREATE POLICY "Admins can delete analysis members"
ON public.people_analysis_members FOR DELETE
USING (EXISTS (
  SELECT 1 FROM people_analyses pa
  WHERE pa.id = people_analysis_members.analysis_id
  AND is_account_admin_or_owner(auth.uid(), pa.account_id)
));

-- RLS Policies for people_analysis_ratings
CREATE POLICY "Admins can view analysis ratings"
ON public.people_analysis_ratings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM people_analysis_members pam
  JOIN people_analyses pa ON pa.id = pam.analysis_id
  WHERE pam.id = people_analysis_ratings.member_id
  AND is_account_admin_or_owner(auth.uid(), pa.account_id)
));

CREATE POLICY "Admins can create analysis ratings"
ON public.people_analysis_ratings FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM people_analysis_members pam
  JOIN people_analyses pa ON pa.id = pam.analysis_id
  WHERE pam.id = people_analysis_ratings.member_id
  AND is_account_admin_or_owner(auth.uid(), pa.account_id)
));

CREATE POLICY "Admins can update analysis ratings"
ON public.people_analysis_ratings FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM people_analysis_members pam
  JOIN people_analyses pa ON pa.id = pam.analysis_id
  WHERE pam.id = people_analysis_ratings.member_id
  AND is_account_admin_or_owner(auth.uid(), pa.account_id)
));

CREATE POLICY "Admins can delete analysis ratings"
ON public.people_analysis_ratings FOR DELETE
USING (EXISTS (
  SELECT 1 FROM people_analysis_members pam
  JOIN people_analyses pa ON pa.id = pam.analysis_id
  WHERE pam.id = people_analysis_ratings.member_id
  AND is_account_admin_or_owner(auth.uid(), pa.account_id)
));