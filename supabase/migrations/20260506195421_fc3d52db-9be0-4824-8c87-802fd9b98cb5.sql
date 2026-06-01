DROP POLICY IF EXISTS "Account members can manage careers settings" ON public.careers_page_settings;

CREATE POLICY "Members and consultants can view careers settings"
  ON public.careers_page_settings FOR SELECT
  USING (
    public.is_account_member(auth.uid(), account_id)
    OR public.can_edit_client_project(auth.uid(), account_id)
  );

CREATE POLICY "Members and consultants can insert careers settings"
  ON public.careers_page_settings FOR INSERT
  WITH CHECK (
    public.is_account_member(auth.uid(), account_id)
    OR public.can_edit_client_project(auth.uid(), account_id)
  );

CREATE POLICY "Members and consultants can update careers settings"
  ON public.careers_page_settings FOR UPDATE
  USING (
    public.is_account_member(auth.uid(), account_id)
    OR public.can_edit_client_project(auth.uid(), account_id)
  )
  WITH CHECK (
    public.is_account_member(auth.uid(), account_id)
    OR public.can_edit_client_project(auth.uid(), account_id)
  );

CREATE POLICY "Members and consultants can delete careers settings"
  ON public.careers_page_settings FOR DELETE
  USING (
    public.is_account_member(auth.uid(), account_id)
    OR public.can_edit_client_project(auth.uid(), account_id)
  );