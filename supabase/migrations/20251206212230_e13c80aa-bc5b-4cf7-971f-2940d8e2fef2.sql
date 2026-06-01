-- Create strategic_indicators table for storing user's BSC indicator selections
CREATE TABLE public.strategic_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  segment TEXT NOT NULL CHECK (segment IN ('industria', 'servicos', 'produto')),
  selected_step1 JSONB DEFAULT '{}'::jsonb,
  final_selection JSONB DEFAULT '[]'::jsonb,
  stage INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.strategic_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own indicators"
ON public.strategic_indicators
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create own indicators"
ON public.strategic_indicators
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own indicators"
ON public.strategic_indicators
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own indicators"
ON public.strategic_indicators
FOR DELETE
USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_strategic_indicators_updated_at
BEFORE UPDATE ON public.strategic_indicators
FOR EACH ROW
EXECUTE FUNCTION public.update_values_sessions_updated_at();