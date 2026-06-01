-- Create culture_code_sessions table for storing Culture Code generation sessions
CREATE TABLE public.culture_code_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_history TEXT,
  structure JSONB,
  slides JSONB DEFAULT '[]'::jsonb,
  stage TEXT DEFAULT 'history',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id)
);

-- Enable RLS
ALTER TABLE public.culture_code_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their account culture code sessions"
  ON public.culture_code_sessions
  FOR SELECT
  USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Users can insert their account culture code sessions"
  ON public.culture_code_sessions
  FOR INSERT
  WITH CHECK (is_account_member(auth.uid(), account_id));

CREATE POLICY "Users can update their account culture code sessions"
  ON public.culture_code_sessions
  FOR UPDATE
  USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Users can delete their account culture code sessions"
  ON public.culture_code_sessions
  FOR DELETE
  USING (is_account_member(auth.uid(), account_id));

-- Trigger for updated_at
CREATE TRIGGER update_culture_code_sessions_updated_at
  BEFORE UPDATE ON public.culture_code_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();