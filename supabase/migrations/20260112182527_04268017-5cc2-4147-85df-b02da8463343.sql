-- Table to store individual interview responses
CREATE TABLE public.culture_interview_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.culture_interview_sessions(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  value_label TEXT,
  candidate_response TEXT,
  ai_comment TEXT,
  follow_up_question TEXT,
  follow_up_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.culture_interview_responses ENABLE ROW LEVEL SECURITY;

-- Policies - allow public access since candidates may not be authenticated
CREATE POLICY "Allow insert for anyone" 
ON public.culture_interview_responses 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow select for anyone" 
ON public.culture_interview_responses 
FOR SELECT 
USING (true);

CREATE POLICY "Allow update for anyone" 
ON public.culture_interview_responses 
FOR UPDATE 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_culture_interview_responses_session 
ON public.culture_interview_responses(session_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_culture_interview_responses_updated_at
BEFORE UPDATE ON public.culture_interview_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();