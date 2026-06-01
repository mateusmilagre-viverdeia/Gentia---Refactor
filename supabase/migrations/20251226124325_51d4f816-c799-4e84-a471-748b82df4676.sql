-- Allow NULL account_id for system-wide default questions
ALTER TABLE public.pulse_questions 
ALTER COLUMN account_id DROP NOT NULL;

-- Update RLS policy to allow viewing system questions (account_id IS NULL)
DROP POLICY IF EXISTS "Pulse admins can manage questions" ON public.pulse_questions;

CREATE POLICY "Pulse admins can manage questions"
ON public.pulse_questions
FOR ALL
USING (
  account_id IS NULL 
  OR is_pulse_admin(auth.uid(), account_id)
)
WITH CHECK (
  is_pulse_admin(auth.uid(), account_id)
);

-- Create policy for viewing system questions
CREATE POLICY "All pulse users can view system questions"
ON public.pulse_questions
FOR SELECT
USING (account_id IS NULL);