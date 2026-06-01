-- Tabela de Agentes de Recrutamento
CREATE TABLE public.recruitment_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'structured', -- structured, conversational
  language TEXT NOT NULL DEFAULT 'pt-BR',
  minimum_score INTEGER DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Perguntas dos Agentes
CREATE TABLE public.recruitment_agent_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.recruitment_agents(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Critérios de Avaliação dos Agentes
CREATE TABLE public.recruitment_agent_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.recruitment_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  excellence_description TEXT,
  warning_signs_description TEXT,
  minimum_score INTEGER DEFAULT 5,
  importance TEXT NOT NULL DEFAULT 'moderate', -- critical, very_important, important, moderate
  weight INTEGER DEFAULT 2,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recruitment_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_agent_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_agent_criteria ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recruitment_agents
CREATE POLICY "Users can view agents in their account" 
ON public.recruitment_agents 
FOR SELECT 
USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Users can create agents in their account" 
ON public.recruitment_agents 
FOR INSERT 
WITH CHECK (is_account_member(auth.uid(), account_id));

CREATE POLICY "Users can update agents in their account" 
ON public.recruitment_agents 
FOR UPDATE 
USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Users can delete agents in their account" 
ON public.recruitment_agents 
FOR DELETE 
USING (is_account_member(auth.uid(), account_id));

-- RLS Policies for recruitment_agent_questions (via agent)
CREATE POLICY "Users can view questions of their agents" 
ON public.recruitment_agent_questions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM recruitment_agents ra 
  WHERE ra.id = agent_id AND is_account_member(auth.uid(), ra.account_id)
));

CREATE POLICY "Users can create questions for their agents" 
ON public.recruitment_agent_questions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM recruitment_agents ra 
  WHERE ra.id = agent_id AND is_account_member(auth.uid(), ra.account_id)
));

CREATE POLICY "Users can update questions of their agents" 
ON public.recruitment_agent_questions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM recruitment_agents ra 
  WHERE ra.id = agent_id AND is_account_member(auth.uid(), ra.account_id)
));

CREATE POLICY "Users can delete questions of their agents" 
ON public.recruitment_agent_questions 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM recruitment_agents ra 
  WHERE ra.id = agent_id AND is_account_member(auth.uid(), ra.account_id)
));

-- RLS Policies for recruitment_agent_criteria (via agent)
CREATE POLICY "Users can view criteria of their agents" 
ON public.recruitment_agent_criteria 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM recruitment_agents ra 
  WHERE ra.id = agent_id AND is_account_member(auth.uid(), ra.account_id)
));

CREATE POLICY "Users can create criteria for their agents" 
ON public.recruitment_agent_criteria 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM recruitment_agents ra 
  WHERE ra.id = agent_id AND is_account_member(auth.uid(), ra.account_id)
));

CREATE POLICY "Users can update criteria of their agents" 
ON public.recruitment_agent_criteria 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM recruitment_agents ra 
  WHERE ra.id = agent_id AND is_account_member(auth.uid(), ra.account_id)
));

CREATE POLICY "Users can delete criteria of their agents" 
ON public.recruitment_agent_criteria 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM recruitment_agents ra 
  WHERE ra.id = agent_id AND is_account_member(auth.uid(), ra.account_id)
));

-- Add foreign key from recruitment_jobs to recruitment_agents
ALTER TABLE public.recruitment_jobs
ADD CONSTRAINT recruitment_jobs_agent_id_fkey 
FOREIGN KEY (agent_id) REFERENCES public.recruitment_agents(id) ON DELETE SET NULL;

-- Create triggers for updated_at
CREATE TRIGGER update_recruitment_agents_updated_at
BEFORE UPDATE ON public.recruitment_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_recruitment_agents_account_id ON public.recruitment_agents(account_id);
CREATE INDEX idx_recruitment_agent_questions_agent_id ON public.recruitment_agent_questions(agent_id);
CREATE INDEX idx_recruitment_agent_criteria_agent_id ON public.recruitment_agent_criteria(agent_id);