-- Create unique_ability_analyses table
CREATE TABLE public.unique_ability_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique_ability_activities table
CREATE TABLE public.unique_ability_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES unique_ability_analyses(id) ON DELETE CASCADE,
  name text NOT NULL,
  skill_score integer CHECK (skill_score >= 1 AND skill_score <= 4),
  value_score integer CHECK (value_score >= 1 AND value_score <= 4),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create unique_ability_version_history table
CREATE TABLE public.unique_ability_version_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES unique_ability_analyses(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  variant text DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.unique_ability_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unique_ability_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unique_ability_version_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for unique_ability_analyses (admin/owner only)
CREATE POLICY "Admins can view unique ability analyses"
ON public.unique_ability_analyses
FOR SELECT
USING (is_account_admin_or_owner(auth.uid(), account_id));

CREATE POLICY "Admins can create unique ability analyses"
ON public.unique_ability_analyses
FOR INSERT
WITH CHECK (is_account_admin_or_owner(auth.uid(), account_id));

CREATE POLICY "Admins can update unique ability analyses"
ON public.unique_ability_analyses
FOR UPDATE
USING (is_account_admin_or_owner(auth.uid(), account_id));

CREATE POLICY "Admins can delete unique ability analyses"
ON public.unique_ability_analyses
FOR DELETE
USING (is_account_admin_or_owner(auth.uid(), account_id));

-- RLS Policies for unique_ability_activities
CREATE POLICY "Admins can view unique ability activities"
ON public.unique_ability_activities
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM unique_ability_analyses ua
  WHERE ua.id = unique_ability_activities.analysis_id
  AND is_account_admin_or_owner(auth.uid(), ua.account_id)
));

CREATE POLICY "Admins can create unique ability activities"
ON public.unique_ability_activities
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM unique_ability_analyses ua
  WHERE ua.id = unique_ability_activities.analysis_id
  AND is_account_admin_or_owner(auth.uid(), ua.account_id)
));

CREATE POLICY "Admins can update unique ability activities"
ON public.unique_ability_activities
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM unique_ability_analyses ua
  WHERE ua.id = unique_ability_activities.analysis_id
  AND is_account_admin_or_owner(auth.uid(), ua.account_id)
));

CREATE POLICY "Admins can delete unique ability activities"
ON public.unique_ability_activities
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM unique_ability_analyses ua
  WHERE ua.id = unique_ability_activities.analysis_id
  AND is_account_admin_or_owner(auth.uid(), ua.account_id)
));

-- RLS Policies for unique_ability_version_history
CREATE POLICY "Admins can view unique ability version history"
ON public.unique_ability_version_history
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM unique_ability_analyses ua
  WHERE ua.id = unique_ability_version_history.analysis_id
  AND is_account_admin_or_owner(auth.uid(), ua.account_id)
));

CREATE POLICY "Admins can create unique ability version history"
ON public.unique_ability_version_history
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM unique_ability_analyses ua
  WHERE ua.id = unique_ability_version_history.analysis_id
  AND is_account_admin_or_owner(auth.uid(), ua.account_id)
));

CREATE POLICY "Admins can delete unique ability version history"
ON public.unique_ability_version_history
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM unique_ability_analyses ua
  WHERE ua.id = unique_ability_version_history.analysis_id
  AND is_account_admin_or_owner(auth.uid(), ua.account_id)
));

-- Create updated_at trigger
CREATE TRIGGER update_unique_ability_analyses_updated_at
BEFORE UPDATE ON public.unique_ability_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();