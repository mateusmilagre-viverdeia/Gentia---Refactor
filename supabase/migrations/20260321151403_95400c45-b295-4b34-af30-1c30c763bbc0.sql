
CREATE TABLE public.implementation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'creation',
  selected_solutions JSONB NOT NULL DEFAULT '[]'::jsonb,
  assessment_data JSONB DEFAULT NULL,
  calculator_data JSONB DEFAULT NULL,
  ai_plan JSONB DEFAULT NULL,
  steps JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.implementation_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own account plans"
  ON public.implementation_plans FOR SELECT
  TO authenticated
  USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Users can insert own account plans"
  ON public.implementation_plans FOR INSERT
  TO authenticated
  WITH CHECK (is_account_member(auth.uid(), account_id));

CREATE POLICY "Users can update own account plans"
  ON public.implementation_plans FOR UPDATE
  TO authenticated
  USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Users can delete own account plans"
  ON public.implementation_plans FOR DELETE
  TO authenticated
  USING (is_account_member(auth.uid(), account_id));

CREATE TRIGGER set_implementation_plans_updated_at
  BEFORE UPDATE ON public.implementation_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
