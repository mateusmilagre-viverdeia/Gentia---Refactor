-- Add job_description_id to onboarding_processes
ALTER TABLE public.onboarding_processes 
ADD COLUMN IF NOT EXISTS job_description_id UUID REFERENCES public.job_descriptions(id);

-- Create onboarding_competency_assessments table
CREATE TABLE IF NOT EXISTS public.onboarding_competency_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.onboarding_processes(id) ON DELETE CASCADE,
  competency_name TEXT NOT NULL,
  competency_type TEXT NOT NULL CHECK (competency_type IN ('technical_required', 'technical_desired', 'behavioral')),
  has_competency BOOLEAN DEFAULT false,
  create_onboarding_task BOOLEAN DEFAULT false,
  add_to_evolution BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_competency_assessments ENABLE ROW LEVEL SECURITY;

-- Create policies for onboarding_competency_assessments
CREATE POLICY "Users can view competency assessments for their account processes"
ON public.onboarding_competency_assessments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.onboarding_processes op
    WHERE op.id = process_id
  )
);

CREATE POLICY "Users can insert competency assessments"
ON public.onboarding_competency_assessments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update competency assessments"
ON public.onboarding_competency_assessments
FOR UPDATE
USING (true);

CREATE POLICY "Users can delete competency assessments"
ON public.onboarding_competency_assessments
FOR DELETE
USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_onboarding_competency_assessments_process_id 
ON public.onboarding_competency_assessments(process_id);

-- Add index on job_description_id
CREATE INDEX IF NOT EXISTS idx_onboarding_processes_job_description_id 
ON public.onboarding_processes(job_description_id);