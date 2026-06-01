-- Tornar candidate_profile_id nullable para suportar convites públicos
ALTER TABLE public.culture_interview_sessions 
ALTER COLUMN candidate_profile_id DROP NOT NULL;

-- Garantir que pelo menos um identificador de candidato esteja presente
ALTER TABLE public.culture_interview_sessions 
ADD CONSTRAINT culture_interview_sessions_candidate_check 
CHECK (candidate_id IS NOT NULL OR candidate_profile_id IS NOT NULL);