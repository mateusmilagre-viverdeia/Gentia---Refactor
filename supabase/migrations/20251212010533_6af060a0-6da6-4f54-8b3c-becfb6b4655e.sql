-- Create selling_company_sessions table (venda_empresa_sessao)
CREATE TABLE public.selling_company_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  stage TEXT NOT NULL DEFAULT 'wizard', -- 'wizard', 'chat', 'summary'
  wizard_step INTEGER NOT NULL DEFAULT 1, -- 1-5 steps
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'generating', 'approved'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id)
);

-- Create selling_company_versions table (venda_empresa_versao)
CREATE TABLE public.selling_company_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.selling_company_sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  prompt_used TEXT,
  model_used TEXT DEFAULT 'google/gemini-2.5-flash',
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.selling_company_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selling_company_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sessions
CREATE POLICY "Members can view account sessions"
ON public.selling_company_sessions
FOR SELECT
USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can create account sessions"
ON public.selling_company_sessions
FOR INSERT
WITH CHECK (is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can update account sessions"
ON public.selling_company_sessions
FOR UPDATE
USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can delete account sessions"
ON public.selling_company_sessions
FOR DELETE
USING (is_account_member(auth.uid(), account_id));

-- RLS Policies for versions
CREATE POLICY "Members can view session versions"
ON public.selling_company_versions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.selling_company_sessions s
  WHERE s.id = selling_company_versions.session_id
  AND is_account_member(auth.uid(), s.account_id)
));

CREATE POLICY "Members can create session versions"
ON public.selling_company_versions
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.selling_company_sessions s
  WHERE s.id = selling_company_versions.session_id
  AND is_account_member(auth.uid(), s.account_id)
));

CREATE POLICY "Members can update session versions"
ON public.selling_company_versions
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.selling_company_sessions s
  WHERE s.id = selling_company_versions.session_id
  AND is_account_member(auth.uid(), s.account_id)
));

CREATE POLICY "Members can delete session versions"
ON public.selling_company_versions
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.selling_company_sessions s
  WHERE s.id = selling_company_versions.session_id
  AND is_account_member(auth.uid(), s.account_id)
));

-- Trigger for updated_at
CREATE TRIGGER update_selling_sessions_updated_at
BEFORE UPDATE ON public.selling_company_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();