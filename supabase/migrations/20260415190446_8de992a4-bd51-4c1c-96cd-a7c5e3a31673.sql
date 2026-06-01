
-- RLS for shortlist_relatorios (authenticated CRUD by account_id)
CREATE POLICY "Members can view own account reports"
ON public.shortlist_relatorios
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = shortlist_relatorios.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
  )
);

CREATE POLICY "Members can create reports"
ON public.shortlist_relatorios
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = shortlist_relatorios.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
  )
);

CREATE POLICY "Members can update own account reports"
ON public.shortlist_relatorios
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = shortlist_relatorios.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
  )
);

-- Anonymous SELECT by token_publico for public report viewer
CREATE POLICY "Anyone can view report by public token"
ON public.shortlist_relatorios
FOR SELECT
TO anon
USING (token_publico IS NOT NULL);

-- Anonymous UPDATE for incrementing views
CREATE POLICY "Anyone can increment views by token"
ON public.shortlist_relatorios
FOR UPDATE
TO anon
USING (token_publico IS NOT NULL)
WITH CHECK (token_publico IS NOT NULL);

-- Anonymous INSERT on portal_feedbacks for report feedback
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'portal_feedbacks' 
    AND policyname = 'Anyone can submit feedback via report'
  ) THEN
    CREATE POLICY "Anyone can submit feedback via report"
    ON public.portal_feedbacks
    FOR INSERT
    TO anon
    WITH CHECK (true);
  END IF;
END $$;
