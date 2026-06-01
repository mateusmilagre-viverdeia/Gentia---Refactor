
-- Create performance_assessments table
CREATE TABLE public.performance_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create performance_assessment_points table (people on the chart)
CREATE TABLE public.performance_assessment_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.performance_assessments(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  x_position NUMERIC NOT NULL, -- 0 to 100 (fit cultural: 0=-, 100=+)
  y_position NUMERIC NOT NULL, -- 0 to 100 (resultado: 0=-, 100=+)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create version history table
CREATE TABLE public.performance_assessment_version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.performance_assessments(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  variant TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.performance_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_assessment_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_assessment_version_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for performance_assessments (owner/admin only like Analisador de Pessoas)
CREATE POLICY "Admins can view performance assessments"
ON public.performance_assessments FOR SELECT
USING (is_account_admin_or_owner(auth.uid(), account_id));

CREATE POLICY "Admins can create performance assessments"
ON public.performance_assessments FOR INSERT
WITH CHECK (is_account_admin_or_owner(auth.uid(), account_id));

CREATE POLICY "Admins can update performance assessments"
ON public.performance_assessments FOR UPDATE
USING (is_account_admin_or_owner(auth.uid(), account_id));

CREATE POLICY "Admins can delete performance assessments"
ON public.performance_assessments FOR DELETE
USING (is_account_admin_or_owner(auth.uid(), account_id));

-- RLS Policies for performance_assessment_points
CREATE POLICY "Admins can view assessment points"
ON public.performance_assessment_points FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.performance_assessments pa
  WHERE pa.id = performance_assessment_points.assessment_id
  AND is_account_admin_or_owner(auth.uid(), pa.account_id)
));

CREATE POLICY "Admins can create assessment points"
ON public.performance_assessment_points FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.performance_assessments pa
  WHERE pa.id = performance_assessment_points.assessment_id
  AND is_account_admin_or_owner(auth.uid(), pa.account_id)
));

CREATE POLICY "Admins can update assessment points"
ON public.performance_assessment_points FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.performance_assessments pa
  WHERE pa.id = performance_assessment_points.assessment_id
  AND is_account_admin_or_owner(auth.uid(), pa.account_id)
));

CREATE POLICY "Admins can delete assessment points"
ON public.performance_assessment_points FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.performance_assessments pa
  WHERE pa.id = performance_assessment_points.assessment_id
  AND is_account_admin_or_owner(auth.uid(), pa.account_id)
));

-- RLS Policies for version history
CREATE POLICY "Admins can view assessment version history"
ON public.performance_assessment_version_history FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.performance_assessments pa
  WHERE pa.id = performance_assessment_version_history.assessment_id
  AND is_account_admin_or_owner(auth.uid(), pa.account_id)
));

CREATE POLICY "Admins can create assessment version history"
ON public.performance_assessment_version_history FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.performance_assessments pa
  WHERE pa.id = performance_assessment_version_history.assessment_id
  AND is_account_admin_or_owner(auth.uid(), pa.account_id)
));

CREATE POLICY "Admins can delete assessment version history"
ON public.performance_assessment_version_history FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.performance_assessments pa
  WHERE pa.id = performance_assessment_version_history.assessment_id
  AND is_account_admin_or_owner(auth.uid(), pa.account_id)
));

-- Update trigger for updated_at
CREATE TRIGGER update_performance_assessments_updated_at
BEFORE UPDATE ON public.performance_assessments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_performance_assessment_points_updated_at
BEFORE UPDATE ON public.performance_assessment_points
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
