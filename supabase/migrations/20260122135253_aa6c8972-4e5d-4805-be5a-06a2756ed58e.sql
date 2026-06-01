-- Create table for agent prompts
CREATE TABLE public.recruitment_agent_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.recruitment_agents(id) ON DELETE CASCADE,
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('system', 'evaluation', 'scoring')),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agent_id, prompt_type)
);

-- Trigger for updated_at
CREATE TRIGGER update_recruitment_agent_prompts_updated_at
  BEFORE UPDATE ON public.recruitment_agent_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.recruitment_agent_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view prompts for their account's agents"
  ON public.recruitment_agent_prompts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recruitment_agents ra 
      WHERE ra.id = agent_id 
      AND is_account_member(auth.uid(), ra.account_id)
    )
  );

CREATE POLICY "Users can insert prompts for their account's agents"
  ON public.recruitment_agent_prompts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recruitment_agents ra 
      WHERE ra.id = agent_id 
      AND is_account_member(auth.uid(), ra.account_id)
    )
  );

CREATE POLICY "Users can update prompts for their account's agents"
  ON public.recruitment_agent_prompts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM recruitment_agents ra 
      WHERE ra.id = agent_id 
      AND is_account_member(auth.uid(), ra.account_id)
    )
  );

CREATE POLICY "Users can delete prompts for their account's agents"
  ON public.recruitment_agent_prompts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM recruitment_agents ra 
      WHERE ra.id = agent_id 
      AND is_account_member(auth.uid(), ra.account_id)
    )
  );