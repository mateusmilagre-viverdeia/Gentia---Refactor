-- Create team_maturity_assessments table
CREATE TABLE public.team_maturity_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create team_maturity_points table
CREATE TABLE public.team_maturity_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.team_maturity_assessments(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  x_position NUMERIC NOT NULL, -- 0-100 (Comprometimento/Energia: 0=Baixo, 100=Alto)
  y_position NUMERIC NOT NULL, -- 0-100 (Habilidades/Competência: 0=Baixa, 100=Alta)
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create team_maturity_version_history table
CREATE TABLE public.team_maturity_version_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.team_maturity_assessments(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  variant TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_maturity_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_maturity_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_maturity_version_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_maturity_assessments (admin/owner only)
CREATE POLICY "Admins can view team maturity assessments"
ON public.team_maturity_assessments FOR SELECT
USING (is_account_admin_or_owner(auth.uid(), account_id));

CREATE POLICY "Admins can create team maturity assessments"
ON public.team_maturity_assessments FOR INSERT
WITH CHECK (is_account_admin_or_owner(auth.uid(), account_id));

CREATE POLICY "Admins can update team maturity assessments"
ON public.team_maturity_assessments FOR UPDATE
USING (is_account_admin_or_owner(auth.uid(), account_id));

CREATE POLICY "Admins can delete team maturity assessments"
ON public.team_maturity_assessments FOR DELETE
USING (is_account_admin_or_owner(auth.uid(), account_id));

-- RLS Policies for team_maturity_points
CREATE POLICY "Admins can view team maturity points"
ON public.team_maturity_points FOR SELECT
USING (EXISTS (
  SELECT 1 FROM team_maturity_assessments tma
  WHERE tma.id = team_maturity_points.assessment_id
  AND is_account_admin_or_owner(auth.uid(), tma.account_id)
));

CREATE POLICY "Admins can create team maturity points"
ON public.team_maturity_points FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM team_maturity_assessments tma
  WHERE tma.id = team_maturity_points.assessment_id
  AND is_account_admin_or_owner(auth.uid(), tma.account_id)
));

CREATE POLICY "Admins can update team maturity points"
ON public.team_maturity_points FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM team_maturity_assessments tma
  WHERE tma.id = team_maturity_points.assessment_id
  AND is_account_admin_or_owner(auth.uid(), tma.account_id)
));

CREATE POLICY "Admins can delete team maturity points"
ON public.team_maturity_points FOR DELETE
USING (EXISTS (
  SELECT 1 FROM team_maturity_assessments tma
  WHERE tma.id = team_maturity_points.assessment_id
  AND is_account_admin_or_owner(auth.uid(), tma.account_id)
));

-- RLS Policies for team_maturity_version_history
CREATE POLICY "Admins can view team maturity version history"
ON public.team_maturity_version_history FOR SELECT
USING (EXISTS (
  SELECT 1 FROM team_maturity_assessments tma
  WHERE tma.id = team_maturity_version_history.assessment_id
  AND is_account_admin_or_owner(auth.uid(), tma.account_id)
));

CREATE POLICY "Admins can create team maturity version history"
ON public.team_maturity_version_history FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM team_maturity_assessments tma
  WHERE tma.id = team_maturity_version_history.assessment_id
  AND is_account_admin_or_owner(auth.uid(), tma.account_id)
));

CREATE POLICY "Admins can delete team maturity version history"
ON public.team_maturity_version_history FOR DELETE
USING (EXISTS (
  SELECT 1 FROM team_maturity_assessments tma
  WHERE tma.id = team_maturity_version_history.assessment_id
  AND is_account_admin_or_owner(auth.uid(), tma.account_id)
));

-- Add triggers for updated_at
CREATE TRIGGER update_team_maturity_assessments_updated_at
BEFORE UPDATE ON public.team_maturity_assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_maturity_points_updated_at
BEFORE UPDATE ON public.team_maturity_points
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();