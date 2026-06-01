-- Create action_plans table
CREATE TABLE public.action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  responsible TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planejada',
  deadline DATE,
  priority TEXT NOT NULL DEFAULT 'media',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own actions" ON public.action_plans FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own actions" ON public.action_plans FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own actions" ON public.action_plans FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own actions" ON public.action_plans FOR DELETE USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_action_plans_updated_at
BEFORE UPDATE ON public.action_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_values_sessions_updated_at();