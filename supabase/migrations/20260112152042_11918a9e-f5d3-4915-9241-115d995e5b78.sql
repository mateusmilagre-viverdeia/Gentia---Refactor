-- Create table for culture interview sessions
CREATE TABLE public.culture_interview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  job_id UUID NOT NULL,
  candidate_profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'abandoned')),
  questions JSONB NOT NULL DEFAULT '[]',
  responses JSONB NOT NULL DEFAULT '[]',
  ai_messages JSONB NOT NULL DEFAULT '[]',
  matching_score INTEGER,
  matching_analysis TEXT,
  duration_seconds INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.culture_interview_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for candidates to view/manage their own sessions
CREATE POLICY "Candidates can view their own interview sessions"
ON public.culture_interview_sessions
FOR SELECT
USING (candidate_profile_id IN (
  SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Candidates can insert their own interview sessions"
ON public.culture_interview_sessions
FOR INSERT
WITH CHECK (candidate_profile_id IN (
  SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Candidates can update their own interview sessions"
ON public.culture_interview_sessions
FOR UPDATE
USING (candidate_profile_id IN (
  SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
));

-- Policy for company members to view interview sessions for their company
CREATE POLICY "Company members can view interview sessions for their company"
ON public.culture_interview_sessions
FOR SELECT
USING (account_id IN (
  SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
));

-- Create trigger for updated_at
CREATE TRIGGER update_culture_interview_sessions_updated_at
BEFORE UPDATE ON public.culture_interview_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();