-- Create recruitment_goals table
CREATE TABLE public.recruitment_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Period
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Goal targets
  goal_hires INTEGER,
  goal_applications INTEGER,
  goal_time_to_hire INTEGER,
  goal_conversion_rate DECIMAL(5,2),
  goal_fill_rate DECIMAL(5,2),
  
  -- Alert configuration
  alert_deviation_threshold INTEGER DEFAULT 20,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  
  -- Metadata
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(account_id, period_type, period_start)
);

-- Enable RLS
ALTER TABLE public.recruitment_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view goals for their account"
  ON public.recruitment_goals FOR SELECT
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Users can insert goals for their account"
  ON public.recruitment_goals FOR INSERT
  WITH CHECK (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Users can update goals for their account"
  ON public.recruitment_goals FOR UPDATE
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Users can delete goals for their account"
  ON public.recruitment_goals FOR DELETE
  USING (account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
  ));

-- Trigger for updated_at
CREATE TRIGGER update_recruitment_goals_updated_at
  BEFORE UPDATE ON public.recruitment_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();