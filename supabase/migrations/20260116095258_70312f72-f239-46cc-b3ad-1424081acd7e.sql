-- Allow public (anonymous) access to approved selling_company_sessions
CREATE POLICY "Public can view approved sessions"
ON public.selling_company_sessions
FOR SELECT
TO anon, authenticated
USING (status = 'approved');

-- Allow public (anonymous) access to approved versions from approved sessions
CREATE POLICY "Public can view approved versions"
ON public.selling_company_versions
FOR SELECT
TO anon, authenticated
USING (
  approved = true
  AND EXISTS (
    SELECT 1 FROM selling_company_sessions s
    WHERE s.id = session_id
    AND s.status = 'approved'
  )
);