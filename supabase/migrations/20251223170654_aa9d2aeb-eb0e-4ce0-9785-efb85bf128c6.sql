-- Create job_descriptions table
CREATE TABLE public.job_descriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  org_node_id UUID REFERENCES public.org_chart_nodes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'approved', 'archived')),
  area TEXT,
  title TEXT NOT NULL,
  mission TEXT,
  indicators TEXT[] DEFAULT '{}',
  responsibilities TEXT[] DEFAULT '{}',
  required_skills TEXT[] DEFAULT '{}',
  desired_skills TEXT[] DEFAULT '{}',
  behavioral_competencies TEXT[] DEFAULT '{}',
  development TEXT,
  benefits TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '[]',
  wizard_step INTEGER DEFAULT 1,
  ai_suggestions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_descriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view job descriptions from their account"
ON public.job_descriptions
FOR SELECT
USING (
  account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create job descriptions for their account"
ON public.job_descriptions
FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update job descriptions from their account"
ON public.job_descriptions
FOR UPDATE
USING (
  account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete job descriptions from their account"
ON public.job_descriptions
FOR DELETE
USING (
  account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_job_descriptions_updated_at
BEFORE UPDATE ON public.job_descriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for common queries
CREATE INDEX idx_job_descriptions_account_id ON public.job_descriptions(account_id);
CREATE INDEX idx_job_descriptions_status ON public.job_descriptions(status);
CREATE INDEX idx_job_descriptions_area ON public.job_descriptions(area);