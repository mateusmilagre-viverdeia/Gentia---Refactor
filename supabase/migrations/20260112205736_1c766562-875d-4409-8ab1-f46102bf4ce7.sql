-- Add DELETE policy for culture_interview_sessions (company members can delete)
CREATE POLICY "Company members can delete interview sessions"
ON public.culture_interview_sessions
FOR DELETE
USING (
  account_id IN (
    SELECT account_id FROM account_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Add DELETE policy for culture_interview_responses (anyone can delete, matching insert/update policies)
CREATE POLICY "Allow delete for authenticated users"
ON public.culture_interview_responses
FOR DELETE
USING (
  session_id IN (
    SELECT id FROM culture_interview_sessions
    WHERE account_id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);