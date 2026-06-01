-- Add compiled_decision column to persist AI compilation results
ALTER TABLE public.decision_sessions 
ADD COLUMN compiled_decision JSONB DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.decision_sessions.compiled_decision IS 'Stores the compiled decision framework (guidelines + summary) to avoid redundant AI calls';