-- Create companies table for storing company information
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  cnpj TEXT,
  sector TEXT,
  employees_count INTEGER,
  current_mission TEXT,
  current_vision TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own company" 
ON public.companies 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own company" 
ON public.companies 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own company" 
ON public.companies 
FOR UPDATE 
USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_values_sessions_updated_at();