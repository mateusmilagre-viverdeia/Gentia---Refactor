-- Drop insecure public access policies
DROP POLICY IF EXISTS "Public can view own interview by token" ON recruitment_interviews;
DROP POLICY IF EXISTS "Public can update own interview" ON recruitment_interviews;

-- Create secure token-validated access policies
-- These require the access_token to be passed in the request and match the stored token
CREATE POLICY "Token-validated interview select"
ON recruitment_interviews FOR SELECT
USING (
  -- Allow authenticated members of the account
  (account_id IN (
    SELECT account_members.account_id
    FROM account_members
    WHERE account_members.user_id = auth.uid()
  ))
  OR
  -- Allow public access ONLY when a valid token is provided via RPC parameter
  -- Token must be non-null and match exactly
  (
    access_token IS NOT NULL 
    AND access_token = current_setting('request.headers', true)::json->>'x-interview-token'
  )
);

CREATE POLICY "Token-validated interview update"
ON recruitment_interviews FOR UPDATE
USING (
  -- Allow authenticated members of the account
  (account_id IN (
    SELECT account_members.account_id
    FROM account_members
    WHERE account_members.user_id = auth.uid()
  ))
  OR
  -- Allow public update ONLY when a valid token is provided
  (
    access_token IS NOT NULL 
    AND access_token = current_setting('request.headers', true)::json->>'x-interview-token'
  )
)
WITH CHECK (
  -- Same conditions for WITH CHECK
  (account_id IN (
    SELECT account_members.account_id
    FROM account_members
    WHERE account_members.user_id = auth.uid()
  ))
  OR
  (
    access_token IS NOT NULL 
    AND access_token = current_setting('request.headers', true)::json->>'x-interview-token'
  )
);