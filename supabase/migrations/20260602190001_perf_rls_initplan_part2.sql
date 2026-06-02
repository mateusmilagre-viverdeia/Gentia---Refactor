-- ============================================================================
-- PERFORMANCE — RLS initplan (parte 2): current_setting() e auth.email()
-- Complemento de 20260602190000. Envolve current_setting(...) e auth.email()
-- em subquery escalar (avaliação única). auth.uid() já-otimizado é preservado.
-- ============================================================================

alter policy "Service role can insert notifications" on public.notifications with check (((select current_setting('request.jwt.claim.role'::text, true)) = 'service_role'::text));
alter policy "Service role can insert billing notifications" on public.billing_notifications with check (((select current_setting('request.jwt.claim.role'::text, true)) = 'service_role'::text));
alter policy "Service role can insert notification recipients" on public.notification_recipients with check (((select current_setting('request.jwt.claim.role'::text, true)) = 'service_role'::text));
alter policy "Token-validated interview select" on public.recruitment_interviews using ((is_account_member(( SELECT auth.uid() AS uid), account_id) OR can_edit_client_project(( SELECT auth.uid() AS uid), account_id) OR ((access_token IS NOT NULL) AND (access_token = (((select current_setting('request.headers'::text, true)))::json ->> 'x-interview-token'::text)))));
alter policy "Token-validated interview update" on public.recruitment_interviews using ((is_account_member(( SELECT auth.uid() AS uid), account_id) OR can_edit_client_project(( SELECT auth.uid() AS uid), account_id) OR ((access_token IS NOT NULL) AND (access_token = (((select current_setting('request.headers'::text, true)))::json ->> 'x-interview-token'::text))))) with check ((is_account_member(( SELECT auth.uid() AS uid), account_id) OR can_edit_client_project(( SELECT auth.uid() AS uid), account_id) OR ((access_token IS NOT NULL) AND (access_token = (((select current_setting('request.headers'::text, true)))::json ->> 'x-interview-token'::text)))));
alter policy "Service role can manage seat grants" on public.org_seat_grants using (((select current_setting('request.jwt.claim.role'::text, true)) = 'service_role'::text)) with check (((select current_setting('request.jwt.claim.role'::text, true)) = 'service_role'::text));
alter policy candidates_read_own_applications on public.recruitment_applications using ((candidate_id IN ( SELECT recruitment_candidates.id
   FROM recruitment_candidates
  WHERE (recruitment_candidates.email = (select auth.email())))));
