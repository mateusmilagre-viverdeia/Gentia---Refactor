-- ============================================================================
-- PERFORMANCE 🔴 — otimização RLS initplan (Frente C). Advisor: auth_rls_initplan
-- ----------------------------------------------------------------------------
-- auth.uid()/auth.role()/auth.jwt() chamados DIRETO numa policy são reavaliados
-- POR LINHA. Envolvendo em subquery escalar -> (select auth.uid()) -> o planner
-- avalia UMA vez (InitPlan) e reusa. Ganho grande em tabelas grandes (10-100x
-- em varreduras). Transformação semanticamente equivalente (recomendação oficial
-- Supabase). 1083 policies; verificado: 0 com mistura (sem risco de duplicar).
-- Isolamento multi-tenant revalidado após aplicar.
-- ============================================================================

alter policy "Org admins can update org requests" on public.access_requests using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = access_requests.target_org_id) AND (am.user_id = (select auth.uid())) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role, 'admin_rh'::account_role])) AND (am.is_active = true)))));
alter policy "Org admins can view org requests" on public.access_requests using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = access_requests.target_org_id) AND (am.user_id = (select auth.uid())) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role, 'admin_rh'::account_role])) AND (am.is_active = true)))));
alter policy "Users can cancel own pending requests" on public.access_requests using ((((select auth.uid()) = requester_id) AND (status = 'pending'::text))) with check ((status = 'cancelled'::text));
alter policy "Users can create access requests" on public.access_requests with check (((select auth.uid()) = requester_id));
alter policy "Users can view own access requests" on public.access_requests using (((select auth.uid()) = requester_id));
alter policy "Members can view their account demo config" on public.account_demo_config using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = account_demo_config.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Owners and admins can insert demo config" on public.account_demo_config with check ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = account_demo_config.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role]))))));
alter policy "Owners and admins can update demo config" on public.account_demo_config using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = account_demo_config.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role]))))));
alter policy "Super admins can delete account health scores" on public.account_health_scores using (is_super_admin((select auth.uid())));
alter policy "Super admins can insert account health scores" on public.account_health_scores with check (is_super_admin((select auth.uid())));
alter policy "Super admins can update account health scores" on public.account_health_scores using (is_super_admin((select auth.uid()))) with check (is_super_admin((select auth.uid())));
alter policy "Super admins can view all account health scores" on public.account_health_scores using (is_super_admin((select auth.uid())));
alter policy "Admins and consultants can create invites" on public.account_invites with check ((can_manage_account((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Admins and consultants can delete invites" on public.account_invites using ((can_manage_account((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Invited users can update their invites" on public.account_invites using ((email = ( SELECT profiles.email
   FROM profiles
  WHERE (profiles.id = (select auth.uid())))));
alter policy "Users can view invites for their email or managed accounts" on public.account_invites using (((email = ( SELECT p.email
   FROM profiles p
  WHERE (p.id = (select auth.uid())))) OR can_manage_account((select auth.uid()), account_id) OR is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "EP Team can manage client licenses" on public.account_licensed_modules using ((EXISTS ( SELECT 1
   FROM ep_consultants
  WHERE ((ep_consultants.user_id = (select auth.uid())) AND (ep_consultants.active = true)))));
alter policy "Users can view own account licenses" on public.account_licensed_modules using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))));
alter policy "Admins and consultants can update account members" on public.account_members using ((can_manage_account((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((can_manage_account((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Admins can delete account members" on public.account_members using ((can_manage_account((select auth.uid()), account_id) AND (user_id <> (select auth.uid()))));
alter policy "Admins can insert account members" on public.account_members with check (can_manage_account((select auth.uid()), account_id));
alter policy "Members can view account members" on public.account_members using (is_account_member((select auth.uid()), account_id));
alter policy "Super admins can view all account members" on public.account_members using (is_super_admin((select auth.uid())));
alter policy "Admins can insert account settings" on public.account_settings with check ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = account_settings.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role, 'admin_rh'::account_role]))))));
alter policy "Admins can update account settings" on public.account_settings using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = account_settings.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role, 'admin_rh'::account_role]))))));
alter policy "Members can view account settings" on public.account_settings using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = account_settings.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Members can create account actions" on public.action_plans with check ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can delete account actions" on public.action_plans using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can update account actions" on public.action_plans using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view account actions" on public.action_plans using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy admin_grants_insert on public.admin_grants with check ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy admin_grants_select on public.admin_grants using ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid())) OR ((org_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.account_id = admin_grants.org_id) AND (account_members.user_id = (select auth.uid())))))) OR (user_id = (select auth.uid()))));
alter policy admin_grants_update on public.admin_grants using ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy "Account members view own anomalies" on public.ai_billing_anomalies using (is_account_member((select auth.uid()), account_id));
alter policy "Super admins manage all anomalies" on public.ai_billing_anomalies using (is_super_admin((select auth.uid()))) with check (is_super_admin((select auth.uid())));
alter policy "Super admins can view audit log" on public.ai_billing_audit_log using (is_super_admin((select auth.uid())));
alter policy "Super admins view audit report" on public.ai_billing_audit_report_20260524 using (is_super_admin((select auth.uid())));
alter policy "Account members can view own account incidents" on public.ai_billing_incidents using (((account_id IS NOT NULL) AND is_account_member((select auth.uid()), account_id)));
alter policy "Super admins can update billing incidents" on public.ai_billing_incidents using (is_super_admin((select auth.uid()))) with check (is_super_admin((select auth.uid())));
alter policy "Super admins can view all billing incidents" on public.ai_billing_incidents using (is_super_admin((select auth.uid())));
alter policy "Super admins can manage baselines" on public.ai_cost_baselines using (is_super_admin((select auth.uid()))) with check (is_super_admin((select auth.uid())));
alter policy "Super admins can read baselines" on public.ai_cost_baselines using (is_super_admin((select auth.uid())));
alter policy "Members can view own org AI logs" on public.ai_execution_logs using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Super admins can delete ai_prompts" on public.ai_prompts using (is_super_admin((select auth.uid())));
alter policy "Super admins can insert ai_prompts" on public.ai_prompts with check (is_super_admin((select auth.uid())));
alter policy "Super admins can update ai_prompts" on public.ai_prompts using (is_super_admin((select auth.uid()))) with check (is_super_admin((select auth.uid())));
alter policy "Super admins can view ai_prompts" on public.ai_prompts using (is_super_admin((select auth.uid())));
alter policy "Admins can create announcements" on public.announcements with check (is_account_admin_or_owner((select auth.uid()), org_id));
alter policy "Admins can delete announcements" on public.announcements using (is_account_admin_or_owner((select auth.uid()), org_id));
alter policy "Admins can update announcements" on public.announcements using (is_account_admin_or_owner((select auth.uid()), org_id));
alter policy "Org members can view announcements" on public.announcements using ((is_account_member((select auth.uid()), org_id) OR is_super_admin((select auth.uid()))));
alter policy "Admins can create invitations" on public.assessment_invitations with check ((is_pulse_admin_or_leader((select auth.uid()), account_id) AND (invited_by = (select auth.uid()))));
alter policy "Admins can delete invitations" on public.assessment_invitations using (is_pulse_admin_or_leader((select auth.uid()), account_id));
alter policy "Admins can view account invitations" on public.assessment_invitations using ((is_pulse_admin_or_leader((select auth.uid()), account_id) OR (invited_user_id = (select auth.uid()))));
alter policy "Users can update invitations" on public.assessment_invitations using (((invited_user_id = (select auth.uid())) OR is_pulse_admin_or_leader((select auth.uid()), account_id))) with check (((invited_user_id = (select auth.uid())) OR is_pulse_admin_or_leader((select auth.uid()), account_id)));
alter policy "Users can delete their own backup codes" on public.backup_codes using ((user_id = (select auth.uid())));
alter policy "Users can insert their own backup codes" on public.backup_codes with check ((user_id = (select auth.uid())));
alter policy "Users can update their own backup codes" on public.backup_codes using ((user_id = (select auth.uid())));
alter policy "Users can view their own backup codes" on public.backup_codes using ((user_id = (select auth.uid())));
alter policy billing_events_select on public.billing_events using ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid())) OR ((org_id IS NOT NULL) AND is_account_admin_or_owner((select auth.uid()), org_id))));
alter policy "Members can view org invoices" on public.billing_invoices using ((org_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))));
alter policy "Super admins can view billing notifications" on public.billing_notifications using (is_super_admin((select auth.uid())));
alter policy "Users can send birthday messages" on public.birthday_messages with check ((((select auth.uid()) = from_user_id) AND (EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = birthday_messages.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true))))));
alter policy "Users can view messages in their org" on public.birthday_messages using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = birthday_messages.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Account members can view CV intelligence" on public.candidate_cv_intelligence using (is_account_member((select auth.uid()), account_id));
alter policy "Candidate can view own CV intelligence" on public.candidate_cv_intelligence using ((EXISTS ( SELECT 1
   FROM candidate_profiles cp
  WHERE ((cp.id = candidate_cv_intelligence.candidate_profile_id) AND (cp.user_id = (select auth.uid()))))));
alter policy "Service role manages CV intelligence" on public.candidate_cv_intelligence using (((select auth.role()) = 'service_role'::text)) with check (((select auth.role()) = 'service_role'::text));
alter policy "Account members can view CV job match" on public.candidate_cv_job_match using (is_account_member((select auth.uid()), account_id));
alter policy "Service role manages CV job match" on public.candidate_cv_job_match using (((select auth.role()) = 'service_role'::text)) with check (((select auth.role()) = 'service_role'::text));
alter policy "Users can view responses for sessions in their account" on public.candidate_disc_responses using ((EXISTS ( SELECT 1
   FROM (candidate_disc_sessions cds
     JOIN account_members am ON ((am.account_id = cds.account_id)))
  WHERE ((cds.id = candidate_disc_responses.session_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy candidates_insert_own_disc_responses on public.candidate_disc_responses with check ((EXISTS ( SELECT 1
   FROM candidate_disc_sessions cds
  WHERE ((cds.id = candidate_disc_responses.session_id) AND (cds.candidate_profile_id IN ( SELECT candidate_profiles.id
           FROM candidate_profiles
          WHERE (candidate_profiles.user_id = (select auth.uid())))) AND (cds.job_id IS NOT NULL)))));
alter policy candidates_update_own_disc_responses on public.candidate_disc_responses using ((EXISTS ( SELECT 1
   FROM candidate_disc_sessions cds
  WHERE ((cds.id = candidate_disc_responses.session_id) AND (cds.candidate_profile_id IN ( SELECT candidate_profiles.id
           FROM candidate_profiles
          WHERE (candidate_profiles.user_id = (select auth.uid())))) AND (cds.job_id IS NOT NULL))))) with check ((EXISTS ( SELECT 1
   FROM candidate_disc_sessions cds
  WHERE ((cds.id = candidate_disc_responses.session_id) AND (cds.candidate_profile_id IN ( SELECT candidate_profiles.id
           FROM candidate_profiles
          WHERE (candidate_profiles.user_id = (select auth.uid())))) AND (cds.job_id IS NOT NULL)))));
alter policy candidates_view_own_disc_responses on public.candidate_disc_responses using ((EXISTS ( SELECT 1
   FROM candidate_disc_sessions cds
  WHERE ((cds.id = candidate_disc_responses.session_id) AND (cds.candidate_profile_id IN ( SELECT candidate_profiles.id
           FROM candidate_profiles
          WHERE (candidate_profiles.user_id = (select auth.uid())))) AND (cds.job_id IS NOT NULL)))));
alter policy "Super admins and consultants can view disc results" on public.candidate_disc_results using ((EXISTS ( SELECT 1
   FROM candidate_disc_sessions cds
  WHERE ((cds.id = candidate_disc_results.session_id) AND can_edit_client_project((select auth.uid()), cds.account_id)))));
alter policy "Users can view results for sessions in their account" on public.candidate_disc_results using ((EXISTS ( SELECT 1
   FROM (candidate_disc_sessions cds
     JOIN account_members am ON ((am.account_id = cds.account_id)))
  WHERE ((cds.id = candidate_disc_results.session_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy candidates_view_own_disc_results on public.candidate_disc_results using ((EXISTS ( SELECT 1
   FROM candidate_disc_sessions cds
  WHERE ((cds.id = candidate_disc_results.session_id) AND (cds.candidate_profile_id IN ( SELECT candidate_profiles.id
           FROM candidate_profiles
          WHERE (candidate_profiles.user_id = (select auth.uid())))) AND (cds.job_id IS NOT NULL)))));
alter policy "Users can insert disc sessions for their account" on public.candidate_disc_sessions with check ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = am.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role, 'admin_rh'::account_role, 'leader'::account_role]))))));
alter policy "Users can update disc sessions for their account" on public.candidate_disc_sessions using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = candidate_disc_sessions.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Users can view disc sessions for their account" on public.candidate_disc_sessions using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id) OR is_super_admin((select auth.uid())) OR (candidate_profile_id IN ( SELECT candidate_profiles.id
   FROM candidate_profiles
  WHERE (candidate_profiles.user_id = (select auth.uid()))))));
alter policy candidates_insert_own_recruitment_disc on public.candidate_disc_sessions with check (((candidate_profile_id IN ( SELECT candidate_profiles.id
   FROM candidate_profiles
  WHERE (candidate_profiles.user_id = (select auth.uid())))) AND (job_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM recruitment_jobs rj
  WHERE ((rj.id = candidate_disc_sessions.job_id) AND (rj.status = 'active'::text))))));
alter policy candidates_update_own_recruitment_disc on public.candidate_disc_sessions using (((candidate_profile_id IN ( SELECT candidate_profiles.id
   FROM candidate_profiles
  WHERE (candidate_profiles.user_id = (select auth.uid())))) AND (job_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM recruitment_jobs rj
  WHERE ((rj.id = candidate_disc_sessions.job_id) AND (rj.status = 'active'::text))))));
alter policy candidates_view_own_recruitment_disc on public.candidate_disc_sessions using (((candidate_profile_id IN ( SELECT candidate_profiles.id
   FROM candidate_profiles
  WHERE (candidate_profiles.user_id = (select auth.uid())))) AND (job_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM recruitment_jobs rj
  WHERE ((rj.id = candidate_disc_sessions.job_id) AND (rj.status = 'active'::text))))));
alter policy "Account members can view candidate education" on public.candidate_education using ((EXISTS ( SELECT 1
   FROM ((candidate_profiles cp
     JOIN culture_interview_sessions cis ON ((cis.candidate_profile_id = cp.id)))
     JOIN account_members am ON ((am.account_id = cis.account_id)))
  WHERE ((cp.id = candidate_education.candidate_profile_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Users can delete their own education" on public.candidate_education using ((EXISTS ( SELECT 1
   FROM candidate_profiles cp
  WHERE ((cp.id = candidate_education.candidate_profile_id) AND (cp.user_id = (select auth.uid()))))));
alter policy "Users can insert their own education" on public.candidate_education with check ((EXISTS ( SELECT 1
   FROM candidate_profiles cp
  WHERE ((cp.id = candidate_education.candidate_profile_id) AND (cp.user_id = (select auth.uid()))))));
alter policy "Users can view their own education" on public.candidate_education using ((EXISTS ( SELECT 1
   FROM candidate_profiles cp
  WHERE ((cp.id = candidate_education.candidate_profile_id) AND (cp.user_id = (select auth.uid()))))));
alter policy "Users can delete candidate embeddings from their organization" on public.candidate_embeddings using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can insert candidate embeddings for their organization" on public.candidate_embeddings with check ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can update candidate embeddings in their organization" on public.candidate_embeddings using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can view candidate embeddings from their organization" on public.candidate_embeddings using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Account members can view external entries" on public.candidate_external_entries using (((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))) OR is_super_admin((select auth.uid()))));
alter policy "Service role and account members can update external entries" on public.candidate_external_entries using (((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))) OR is_super_admin((select auth.uid())) OR ((select auth.role()) = 'service_role'::text)));
alter policy "Account members can insert NPS" on public.candidate_nps with check (((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = candidate_nps.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))) OR is_super_admin((select auth.uid()))));
alter policy "Account members can update NPS" on public.candidate_nps using (((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = candidate_nps.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))) OR is_super_admin((select auth.uid()))));
alter policy "Account members can view NPS" on public.candidate_nps using (((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = candidate_nps.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))) OR is_super_admin((select auth.uid()))));
alter policy "Users can view nudge logs for their account" on public.candidate_nudge_log using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can create process history" on public.candidate_process_history with check (is_account_member((select auth.uid()), account_id));
alter policy "Members can delete process history" on public.candidate_process_history using (is_account_member((select auth.uid()), account_id));
alter policy "Members can update process history" on public.candidate_process_history using (is_account_member((select auth.uid()), account_id));
alter policy "Members can view process history" on public.candidate_process_history using (is_account_member((select auth.uid()), account_id));
alter policy "Company members can view candidate profiles for their interview" on public.candidate_profiles using ((((select auth.uid()) = user_id) OR is_company_member_for_candidate(id)));
alter policy "Users can insert their own candidate profile" on public.candidate_profiles with check (((select auth.uid()) = user_id));
alter policy "Users can update their own candidate profile" on public.candidate_profiles using (((select auth.uid()) = user_id));
alter policy "Users can view their own candidate profile" on public.candidate_profiles using (((select auth.uid()) = user_id));
alter policy "Account members can insert tracking events" on public.candidate_tracking_events with check ((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.account_id = candidate_tracking_events.account_id) AND (account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Account members can view tracking events" on public.candidate_tracking_events using ((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.account_id = candidate_tracking_events.account_id) AND (account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Service role can manage all tracking events" on public.candidate_tracking_events using ((((select auth.jwt()) ->> 'role'::text) = 'service_role'::text));
alter policy "Account members can view candidate work history" on public.candidate_work_history using ((EXISTS ( SELECT 1
   FROM ((candidate_profiles cp
     JOIN culture_interview_sessions cis ON ((cis.candidate_profile_id = cp.id)))
     JOIN account_members am ON ((am.account_id = cis.account_id)))
  WHERE ((cp.id = candidate_work_history.candidate_profile_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Users can delete their own work history" on public.candidate_work_history using ((EXISTS ( SELECT 1
   FROM candidate_profiles cp
  WHERE ((cp.id = candidate_work_history.candidate_profile_id) AND (cp.user_id = (select auth.uid()))))));
alter policy "Users can insert their own work history" on public.candidate_work_history with check ((EXISTS ( SELECT 1
   FROM candidate_profiles cp
  WHERE ((cp.id = candidate_work_history.candidate_profile_id) AND (cp.user_id = (select auth.uid()))))));
alter policy "Users can view their own work history" on public.candidate_work_history using ((EXISTS ( SELECT 1
   FROM candidate_profiles cp
  WHERE ((cp.id = candidate_work_history.candidate_profile_id) AND (cp.user_id = (select auth.uid()))))));
alter policy "Members and consultants can delete careers settings" on public.careers_page_settings using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members and consultants can insert careers settings" on public.careers_page_settings with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members and consultants can update careers settings" on public.careers_page_settings using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members and consultants can view careers settings" on public.careers_page_settings using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "EP Team can create checkpoint actions" on public.checkpoint_actions with check (can_manage_checkpoints((select auth.uid()), account_id));
alter policy "EP Team can delete checkpoint actions" on public.checkpoint_actions using (can_manage_checkpoints((select auth.uid()), account_id));
alter policy "EP Team can update checkpoint actions" on public.checkpoint_actions using (can_manage_checkpoints((select auth.uid()), account_id));
alter policy "Users can view checkpoint actions" on public.checkpoint_actions using (can_view_checkpoints((select auth.uid()), account_id));
alter policy "Members and EP consultants can insert captures" on public.chrome_extension_captures with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members and EP consultants can update captures" on public.chrome_extension_captures using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members and EP consultants can view captures" on public.chrome_extension_captures using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can create career pages" on public.client_career_pages with check ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role, 'admin_rh'::account_role, 'leader'::account_role]))))));
alter policy "Account members can delete career pages" on public.client_career_pages using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role]))))));
alter policy "Account members can update career pages" on public.client_career_pages using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role, 'admin_rh'::account_role, 'leader'::account_role]))))));
alter policy "Account members can view career pages" on public.client_career_pages using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can delete own org clients" on public.clientes_consultoria using (((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = clientes_consultoria.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can insert own org clients" on public.clientes_consultoria with check (((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = clientes_consultoria.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update own org clients" on public.clientes_consultoria using (((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = clientes_consultoria.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view own org clients" on public.clientes_consultoria using (((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = clientes_consultoria.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can delete own org contacts" on public.clientes_contatos using (((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = clientes_contatos.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can insert own org contacts" on public.clientes_contatos with check (((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = clientes_contatos.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update own org contacts" on public.clientes_contatos using (((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = clientes_contatos.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view own org contacts" on public.clientes_contatos using (((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = clientes_contatos.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can insert commercial proposals" on public.commercial_proposals with check ((is_account_member(account_id, (select auth.uid())) AND (created_by = (select auth.uid()))));
alter policy "Account members can update commercial proposals" on public.commercial_proposals using (is_account_member(account_id, (select auth.uid()))) with check (is_account_member(account_id, (select auth.uid())));
alter policy "Account members can view commercial proposals" on public.commercial_proposals using (is_account_member(account_id, (select auth.uid())));
alter policy "Admins can delete commercial proposals" on public.commercial_proposals using (is_account_admin_or_owner(account_id, (select auth.uid())));
alter policy "Account owners and super admins can delete company" on public.companies using (((user_id = (select auth.uid())) OR is_super_admin((select auth.uid()))));
alter policy "Admins can update account" on public.companies using (can_manage_account((select auth.uid()), id));
alter policy "Members can view their account" on public.companies using ((is_account_member((select auth.uid()), id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), id)));
alter policy "Users can create accounts" on public.companies with check ((user_id = (select auth.uid())));
alter policy "Users can insert stats for their company" on public.company_gamification_stats with check ((account_id IN ( SELECT p.account_id
   FROM profiles p
  WHERE (p.id = (select auth.uid())))));
alter policy "Users can update stats for their company" on public.company_gamification_stats using ((account_id IN ( SELECT p.account_id
   FROM profiles p
  WHERE (p.id = (select auth.uid())))));
alter policy "Users can view stats for their company" on public.company_gamification_stats using ((account_id IN ( SELECT p.account_id
   FROM profiles p
  WHERE (p.id = (select auth.uid())))));
alter policy "Account editors can delete company holidays" on public.company_holidays using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account editors can insert company holidays" on public.company_holidays with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account editors can update company holidays" on public.company_holidays using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can view company holidays" on public.company_holidays using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can manage compensation models of their account" on public.compensation_models using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))));
alter policy "Users can view compensation models of their account" on public.compensation_models using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))));
alter policy "Users can manage their org portal settings" on public.consultancy_portal_settings using ((account_id IN ( SELECT am.account_id
   FROM account_members am
  WHERE ((am.user_id = (select auth.uid())) AND (am.is_active = true))))) with check ((account_id IN ( SELECT am.account_id
   FROM account_members am
  WHERE ((am.user_id = (select auth.uid())) AND (am.is_active = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role, 'admin_rh'::account_role]))))));
alter policy "Authenticated users can insert audit logs" on public.consultant_access_logs with check (((select auth.uid()) IS NOT NULL));
alter policy "Consultants can view own audit logs" on public.consultant_access_logs using ((user_id = (select auth.uid())));
alter policy "EP Team can view all audit logs" on public.consultant_access_logs using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = (select auth.uid())) AND (ur.role = ANY (ARRAY['super_admin'::app_role, 'head_cs'::app_role]))))));
alter policy "Consultants can view their own assignments" on public.consultant_assignments using ((EXISTS ( SELECT 1
   FROM ep_consultants ec
  WHERE ((ec.id = consultant_assignments.consultant_id) AND (ec.user_id = (select auth.uid()))))));
alter policy "Super Admin and Head CS can create assignments" on public.consultant_assignments with check (can_manage_consultants((select auth.uid())));
alter policy "Super Admin and Head CS can delete assignments" on public.consultant_assignments using (can_manage_consultants((select auth.uid())));
alter policy "Super Admin and Head CS can update assignments" on public.consultant_assignments using (can_manage_consultants((select auth.uid())));
alter policy "Super Admin and Head CS can view all assignments" on public.consultant_assignments using (can_manage_consultants((select auth.uid())));
alter policy "EP team can read consultant availability blocks" on public.consultant_availability_blocks using ((has_role((select auth.uid()), 'super_admin'::app_role) OR has_role((select auth.uid()), 'head_cs'::app_role) OR has_role((select auth.uid()), 'ep_consultant'::app_role) OR has_role((select auth.uid()), 'ep_partner'::app_role)));
alter policy "Head CS can delete consultant availability blocks" on public.consultant_availability_blocks using ((has_role((select auth.uid()), 'super_admin'::app_role) OR has_role((select auth.uid()), 'head_cs'::app_role)));
alter policy "Head CS can insert consultant availability blocks" on public.consultant_availability_blocks with check ((has_role((select auth.uid()), 'super_admin'::app_role) OR has_role((select auth.uid()), 'head_cs'::app_role)));
alter policy "Head CS can update consultant availability blocks" on public.consultant_availability_blocks using ((has_role((select auth.uid()), 'super_admin'::app_role) OR has_role((select auth.uid()), 'head_cs'::app_role))) with check ((has_role((select auth.uid()), 'super_admin'::app_role) OR has_role((select auth.uid()), 'head_cs'::app_role)));
alter policy "EP team can read consultant capacity settings" on public.consultant_capacity_settings using ((has_role((select auth.uid()), 'super_admin'::app_role) OR has_role((select auth.uid()), 'head_cs'::app_role) OR has_role((select auth.uid()), 'ep_consultant'::app_role) OR has_role((select auth.uid()), 'ep_partner'::app_role)));
alter policy "Head CS can delete consultant capacity settings" on public.consultant_capacity_settings using ((has_role((select auth.uid()), 'super_admin'::app_role) OR has_role((select auth.uid()), 'head_cs'::app_role)));
alter policy "Head CS can manage consultant capacity settings" on public.consultant_capacity_settings with check ((has_role((select auth.uid()), 'super_admin'::app_role) OR has_role((select auth.uid()), 'head_cs'::app_role)));
alter policy "Head CS can update consultant capacity settings" on public.consultant_capacity_settings using ((has_role((select auth.uid()), 'super_admin'::app_role) OR has_role((select auth.uid()), 'head_cs'::app_role))) with check ((has_role((select auth.uid()), 'super_admin'::app_role) OR has_role((select auth.uid()), 'head_cs'::app_role)));
alter policy "EP Team can create consultant notes" on public.consultant_notes with check (can_view_consultant_notes((select auth.uid()), account_id));
alter policy "EP Team can delete consultant notes" on public.consultant_notes using (can_view_consultant_notes((select auth.uid()), account_id));
alter policy "EP Team can update consultant notes" on public.consultant_notes using (can_view_consultant_notes((select auth.uid()), account_id));
alter policy "EP Team can view consultant notes" on public.consultant_notes using (can_view_consultant_notes((select auth.uid()), account_id));
alter policy "Consultants can manage own preferences" on public.consultant_notification_preferences using ((EXISTS ( SELECT 1
   FROM ep_consultants ec
  WHERE ((ec.id = consultant_notification_preferences.consultant_id) AND (ec.user_id = (select auth.uid()))))));
alter policy "EP Team can view all preferences" on public.consultant_notification_preferences using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = (select auth.uid())) AND (ur.role = ANY (ARRAY['super_admin'::app_role, 'head_cs'::app_role]))))));
alter policy "consultant reads own invites" on public.consultant_satisfaction_invites using ((consultant_user_id = (select auth.uid())));
alter policy "satisfaction admins manage invites" on public.consultant_satisfaction_invites using (is_satisfaction_admin((select auth.uid()))) with check (is_satisfaction_admin((select auth.uid())));
alter policy "satisfaction admins manage questions" on public.consultant_satisfaction_questions using (is_satisfaction_admin((select auth.uid()))) with check (is_satisfaction_admin((select auth.uid())));
alter policy "consultant reads own responses" on public.consultant_satisfaction_responses using ((EXISTS ( SELECT 1
   FROM consultant_satisfaction_invites i
  WHERE ((i.id = consultant_satisfaction_responses.invite_id) AND (i.consultant_user_id = (select auth.uid()))))));
alter policy "satisfaction admins read responses" on public.consultant_satisfaction_responses using (is_satisfaction_admin((select auth.uid())));
alter policy "satisfaction admins manage templates" on public.consultant_satisfaction_templates using (is_satisfaction_admin((select auth.uid()))) with check (is_satisfaction_admin((select auth.uid())));
alter policy "Consultants manage own time entries" on public.consultant_time_entries using ((consultant_id IN ( SELECT ep_consultants.id
   FROM ep_consultants
  WHERE (ep_consultants.user_id = (select auth.uid()))))) with check ((consultant_id IN ( SELECT ep_consultants.id
   FROM ep_consultants
  WHERE (ep_consultants.user_id = (select auth.uid())))));
alter policy "Managers view all time entries" on public.consultant_time_entries using ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = ANY (ARRAY['super_admin'::app_role, 'head_cs'::app_role]))))));
alter policy "Users can update recommendations for their account" on public.continuous_hiring_recommendations using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can view recommendations for their account" on public.continuous_hiring_recommendations using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Super admins manage courses" on public.courses using (is_super_admin((select auth.uid())));
alter policy "Users can delete their org files" on public.culture_code_files using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can insert files for their org" on public.culture_code_files with check ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can update their org files" on public.culture_code_files using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can view their org files" on public.culture_code_files using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can insert culture code sessions" on public.culture_code_sessions with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update culture code sessions" on public.culture_code_sessions using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view culture code sessions" on public.culture_code_sessions using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can delete their account culture code sessions" on public.culture_code_sessions using (is_account_member((select auth.uid()), account_id));
alter policy "Users can insert their account culture code sessions" on public.culture_code_sessions with check (is_account_member((select auth.uid()), account_id));
alter policy "Users can create shares for their org" on public.culture_code_shares with check ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can delete their org shares" on public.culture_code_shares using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can update their org shares" on public.culture_code_shares using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can view their org shares" on public.culture_code_shares using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Super admins can delete culture templates" on public.culture_code_templates using (is_super_admin((select auth.uid())));
alter policy "Super admins can insert culture templates" on public.culture_code_templates with check (is_super_admin((select auth.uid())));
alter policy "Members can delete culture code history" on public.culture_code_version_history using ((EXISTS ( SELECT 1
   FROM culture_code_sessions ccs
  WHERE ((ccs.id = culture_code_version_history.session_id) AND is_account_member((select auth.uid()), ccs.account_id)))));
alter policy "Members can insert culture code history" on public.culture_code_version_history with check ((EXISTS ( SELECT 1
   FROM culture_code_sessions ccs
  WHERE ((ccs.id = culture_code_version_history.session_id) AND is_account_member((select auth.uid()), ccs.account_id)))));
alter policy "Members can view culture code history" on public.culture_code_version_history using ((EXISTS ( SELECT 1
   FROM culture_code_sessions ccs
  WHERE ((ccs.id = culture_code_version_history.session_id) AND is_account_member((select auth.uid()), ccs.account_id)))));
alter policy "Members can view behavioral insights for their account sessions" on public.culture_interview_behavioral_insights using ((EXISTS ( SELECT 1
   FROM (culture_interview_sessions cis
     JOIN account_members am ON ((am.account_id = cis.account_id)))
  WHERE ((cis.id = culture_interview_behavioral_insights.session_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Account members can view criteria evaluations" on public.culture_interview_criteria_evaluations using ((EXISTS ( SELECT 1
   FROM culture_interview_sessions cis
  WHERE ((cis.id = culture_interview_criteria_evaluations.session_id) AND is_account_member((select auth.uid()), cis.account_id)))));
alter policy "Account members can insert interview responses" on public.culture_interview_responses with check ((EXISTS ( SELECT 1
   FROM culture_interview_sessions cis
  WHERE ((cis.id = culture_interview_responses.session_id) AND is_account_member((select auth.uid()), cis.account_id)))));
alter policy "Account members or consultants can update interview responses" on public.culture_interview_responses using ((EXISTS ( SELECT 1
   FROM culture_interview_sessions cis
  WHERE ((cis.id = culture_interview_responses.session_id) AND (is_account_member((select auth.uid()), cis.account_id) OR can_edit_client_project((select auth.uid()), cis.account_id))))));
alter policy "Account members or consultants can view interview responses" on public.culture_interview_responses using ((EXISTS ( SELECT 1
   FROM culture_interview_sessions cis
  WHERE ((cis.id = culture_interview_responses.session_id) AND (is_account_member((select auth.uid()), cis.account_id) OR can_edit_client_project((select auth.uid()), cis.account_id))))));
alter policy "Allow delete for authenticated users" on public.culture_interview_responses using ((session_id IN ( SELECT culture_interview_sessions.id
   FROM culture_interview_sessions
  WHERE (culture_interview_sessions.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))))));
alter policy "Candidates can insert their own interview sessions" on public.culture_interview_sessions with check ((candidate_profile_id IN ( SELECT candidate_profiles.id
   FROM candidate_profiles
  WHERE (candidate_profiles.user_id = (select auth.uid())))));
alter policy "Company members can insert interview sessions" on public.culture_interview_sessions with check ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members and admins can delete interview sessions" on public.culture_interview_sessions using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id) OR is_super_admin((select auth.uid()))));
alter policy "Members and admins can update interview sessions" on public.culture_interview_sessions using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id) OR is_super_admin((select auth.uid())) OR (candidate_profile_id IN ( SELECT candidate_profiles.id
   FROM candidate_profiles
  WHERE (candidate_profiles.user_id = (select auth.uid()))))));
alter policy "Members and admins can view interview sessions" on public.culture_interview_sessions using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id) OR is_super_admin((select auth.uid())) OR (candidate_profile_id IN ( SELECT candidate_profiles.id
   FROM candidate_profiles
  WHERE (candidate_profiles.user_id = (select auth.uid()))))));
alter policy "Account members can read cv_match_cache" on public.cv_match_cache using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id) OR is_super_admin((select auth.uid()))));
alter policy "Members can manage decision answers" on public.decision_answers using ((EXISTS ( SELECT 1
   FROM decision_sessions ds
  WHERE ((ds.id = decision_answers.session_id) AND ((ds.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), ds.account_id) OR can_edit_client_project((select auth.uid()), ds.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM decision_sessions ds
  WHERE ((ds.id = decision_answers.session_id) AND ((ds.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), ds.account_id) OR can_edit_client_project((select auth.uid()), ds.account_id))))));
alter policy "Members can create account decision sessions" on public.decision_sessions with check ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can delete account decision sessions" on public.decision_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can update account decision sessions" on public.decision_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view account decision sessions" on public.decision_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can manage decision history" on public.decision_version_history using ((EXISTS ( SELECT 1
   FROM decision_sessions
  WHERE ((decision_sessions.id = decision_version_history.session_id) AND is_account_member((select auth.uid()), decision_sessions.account_id)))));
alter policy "Members can manage account selections" on public.development_selections using ((EXISTS ( SELECT 1
   FROM development_sessions ds
  WHERE ((ds.id = development_selections.session_id) AND ((ds.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), ds.account_id) OR can_edit_client_project((select auth.uid()), ds.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM development_sessions ds
  WHERE ((ds.id = development_selections.session_id) AND ((ds.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), ds.account_id) OR can_edit_client_project((select auth.uid()), ds.account_id))))));
alter policy "Members can create account development sessions" on public.development_sessions with check ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can delete account development sessions" on public.development_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can update account development sessions" on public.development_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view account development sessions" on public.development_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can manage development history" on public.development_version_history using ((EXISTS ( SELECT 1
   FROM development_sessions
  WHERE ((development_sessions.id = development_version_history.session_id) AND is_account_member((select auth.uid()), development_sessions.account_id)))));
alter policy "Users can insert responses for their sessions" on public.disc_responses with check ((EXISTS ( SELECT 1
   FROM disc_sessions ds
  WHERE ((ds.id = disc_responses.session_id) AND (ds.user_id = (select auth.uid()))))));
alter policy "Users can view responses for their sessions" on public.disc_responses using ((EXISTS ( SELECT 1
   FROM disc_sessions ds
  WHERE ((ds.id = disc_responses.session_id) AND ((ds.user_id = (select auth.uid())) OR is_pulse_admin_or_leader((select auth.uid()), ds.account_id))))));
alter policy "Users can view results for their sessions" on public.disc_results using ((EXISTS ( SELECT 1
   FROM disc_sessions ds
  WHERE ((ds.id = disc_results.session_id) AND ((ds.user_id = (select auth.uid())) OR is_pulse_admin_or_leader((select auth.uid()), ds.account_id))))));
alter policy "Account members can create DISC sessions" on public.disc_sessions with check (is_account_member((select auth.uid()), account_id));
alter policy "Users can delete their own DISC sessions or as admin" on public.disc_sessions using (((user_id = (select auth.uid())) OR is_pulse_admin_or_leader((select auth.uid()), account_id)));
alter policy "Users can update their own DISC sessions or as admin" on public.disc_sessions using (((user_id = (select auth.uid())) OR is_pulse_admin_or_leader((select auth.uid()), account_id))) with check (((user_id = (select auth.uid())) OR is_pulse_admin_or_leader((select auth.uid()), account_id)));
alter policy "Users can view their own DISC sessions or as admin" on public.disc_sessions using (((user_id = (select auth.uid())) OR is_pulse_admin_or_leader((select auth.uid()), account_id)));
alter policy "Account admins can update email intake config" on public.email_intake_config using (((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role, 'admin_rh'::account_role]))))) OR is_super_admin((select auth.uid()))));
alter policy "Account members can view email intake config" on public.email_intake_config using (((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))) OR is_super_admin((select auth.uid()))));
alter policy "Service role can insert send log" on public.email_send_log with check (((select auth.role()) = 'service_role'::text));
alter policy "Service role can read send log" on public.email_send_log using (((select auth.role()) = 'service_role'::text));
alter policy "Service role can update send log" on public.email_send_log using (((select auth.role()) = 'service_role'::text)) with check (((select auth.role()) = 'service_role'::text));
alter policy "Service role can manage send state" on public.email_send_state using (((select auth.role()) = 'service_role'::text)) with check (((select auth.role()) = 'service_role'::text));
alter policy "Service role can insert tokens" on public.email_unsubscribe_tokens with check (((select auth.role()) = 'service_role'::text));
alter policy "Service role can mark tokens as used" on public.email_unsubscribe_tokens using (((select auth.role()) = 'service_role'::text)) with check (((select auth.role()) = 'service_role'::text));
alter policy "Service role can read tokens" on public.email_unsubscribe_tokens using (((select auth.role()) = 'service_role'::text));
alter policy "Users can manage employee positions of their account" on public.employee_positions using ((level_id IN ( SELECT pl.id
   FROM (((position_levels pl
     JOIN positions p ON ((p.id = pl.position_id)))
     JOIN job_families jf ON ((jf.id = p.family_id)))
     JOIN compensation_models cm ON ((cm.id = jf.model_id)))
  WHERE (cm.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can view employee positions of their account" on public.employee_positions using ((level_id IN ( SELECT pl.id
   FROM (((position_levels pl
     JOIN positions p ON ((p.id = pl.position_id)))
     JOIN job_families jf ON ((jf.id = p.family_id)))
     JOIN compensation_models cm ON ((cm.id = jf.model_id)))
  WHERE (cm.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Members can manage testimonials" on public.employee_testimonials using ((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.account_id = employee_testimonials.account_id) AND (account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can view testimonials" on public.employee_testimonials using ((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.account_id = employee_testimonials.account_id) AND (account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Account members can view employees basic info" on public.employees using (is_account_member((select auth.uid()), account_id));
alter policy "Admins can delete employees" on public.employees using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = employees.account_id) AND (am.user_id = (select auth.uid())) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])) AND (am.is_active = true)))));
alter policy "Admins can insert employees" on public.employees with check ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = employees.account_id) AND (am.user_id = (select auth.uid())) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])) AND (am.is_active = true)))));
alter policy "Admins can update employees" on public.employees using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = employees.account_id) AND (am.user_id = (select auth.uid())) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])) AND (am.is_active = true)))));
alter policy "Members can view employees of their organization" on public.employees using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = employees.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Members can manage account selections" on public.energy_selections using ((EXISTS ( SELECT 1
   FROM energy_sessions es
  WHERE ((es.id = energy_selections.session_id) AND ((es.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), es.account_id) OR can_edit_client_project((select auth.uid()), es.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM energy_sessions es
  WHERE ((es.id = energy_selections.session_id) AND ((es.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), es.account_id) OR can_edit_client_project((select auth.uid()), es.account_id))))));
alter policy "Members can create account energy sessions" on public.energy_sessions with check ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can delete account energy sessions" on public.energy_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can update account energy sessions" on public.energy_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view account energy sessions" on public.energy_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can manage energy history" on public.energy_version_history using ((EXISTS ( SELECT 1
   FROM energy_sessions
  WHERE ((energy_sessions.id = energy_version_history.session_id) AND is_account_member((select auth.uid()), energy_sessions.account_id)))));
alter policy "Consultants can view themselves" on public.ep_consultants using ((user_id = (select auth.uid())));
alter policy "Super Admin and Head CS can create consultants" on public.ep_consultants with check (can_manage_consultants((select auth.uid())));
alter policy "Super Admin and Head CS can delete consultants" on public.ep_consultants using (can_manage_consultants((select auth.uid())));
alter policy "Super Admin and Head CS can update consultants" on public.ep_consultants using (can_manage_consultants((select auth.uid())));
alter policy "Super Admin and Head CS can view all consultants" on public.ep_consultants using (can_manage_consultants((select auth.uid())));
alter policy "EP managers can create invites" on public.ep_invites with check ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy "EP managers can update invites" on public.ep_invites using ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy "EP managers can view all invites" on public.ep_invites using ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy "Users can view their own pending invite" on public.ep_invites using (((accepted = false) AND (expires_at > now()) AND (email = ((select auth.jwt()) ->> 'email'::text))));
alter policy "Partner owners can delete users" on public.ep_partner_users using (((partner_id IN ( SELECT ep_partners.id
   FROM ep_partners
  WHERE (ep_partners.user_id = (select auth.uid())))) OR is_super_admin((select auth.uid()))));
alter policy "Partner owners can insert users" on public.ep_partner_users with check (((partner_id IN ( SELECT ep_partners.id
   FROM ep_partners
  WHERE (ep_partners.user_id = (select auth.uid())))) OR is_super_admin((select auth.uid()))));
alter policy "Partner owners can view their users" on public.ep_partner_users using (((partner_id IN ( SELECT ep_partners.id
   FROM ep_partners
  WHERE (ep_partners.user_id = (select auth.uid())))) OR (user_id = (select auth.uid()))));
alter policy "Super admins can manage all partner users" on public.ep_partner_users using (is_super_admin((select auth.uid())));
alter policy ep_partners_select on public.ep_partners using (((user_id = (select auth.uid())) OR is_super_admin((select auth.uid()))));
alter policy "Super admins can insert tier change log" on public.evaluator_tier_change_log with check (is_super_admin((select auth.uid())));
alter policy "Super admins can read tier change log" on public.evaluator_tier_change_log using (is_super_admin((select auth.uid())));
alter policy "Members can manage event items" on public.event_items using ((EXISTS ( SELECT 1
   FROM event_sessions es
  WHERE ((es.id = event_items.session_id) AND ((es.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), es.account_id) OR can_edit_client_project((select auth.uid()), es.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM event_sessions es
  WHERE ((es.id = event_items.session_id) AND ((es.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), es.account_id) OR can_edit_client_project((select auth.uid()), es.account_id))))));
alter policy "Members can create account event sessions" on public.event_sessions with check ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can delete account event sessions" on public.event_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can update account event sessions" on public.event_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view account event sessions" on public.event_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can manage event history" on public.event_version_history using ((EXISTS ( SELECT 1
   FROM event_sessions es
  WHERE ((es.id = event_version_history.session_id) AND ((es.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), es.account_id) OR can_edit_client_project((select auth.uid()), es.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM event_sessions es
  WHERE ((es.id = event_version_history.session_id) AND ((es.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), es.account_id) OR can_edit_client_project((select auth.uid()), es.account_id))))));
alter policy "Users can manage evolution actions" on public.evolution_actions using ((objective_id IN ( SELECT o.id
   FROM (evolution_objectives o
     JOIN evolution_cycles c ON ((o.cycle_id = c.id)))
  WHERE (c.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can view evolution actions" on public.evolution_actions using ((objective_id IN ( SELECT o.id
   FROM (evolution_objectives o
     JOIN evolution_cycles c ON ((o.cycle_id = c.id)))
  WHERE (c.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can manage evolution checkins" on public.evolution_checkins using ((cycle_id IN ( SELECT evolution_cycles.id
   FROM evolution_cycles
  WHERE (evolution_cycles.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can view evolution checkins" on public.evolution_checkins using ((cycle_id IN ( SELECT evolution_cycles.id
   FROM evolution_cycles
  WHERE (evolution_cycles.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can manage evolution competencies" on public.evolution_competencies using ((cycle_id IN ( SELECT evolution_cycles.id
   FROM evolution_cycles
  WHERE (evolution_cycles.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can view evolution competencies" on public.evolution_competencies using ((cycle_id IN ( SELECT evolution_cycles.id
   FROM evolution_cycles
  WHERE (evolution_cycles.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can create evolution cycles in their account" on public.evolution_cycles with check ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))));
alter policy "Users can delete evolution cycles in their account" on public.evolution_cycles using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))));
alter policy "Users can update evolution cycles in their account" on public.evolution_cycles using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))));
alter policy "Users can view evolution cycles in their account" on public.evolution_cycles using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))));
alter policy "Users can manage evolution feedbacks" on public.evolution_feedbacks using ((cycle_id IN ( SELECT evolution_cycles.id
   FROM evolution_cycles
  WHERE (evolution_cycles.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can view evolution feedbacks" on public.evolution_feedbacks using ((cycle_id IN ( SELECT evolution_cycles.id
   FROM evolution_cycles
  WHERE (evolution_cycles.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can manage evolution objectives" on public.evolution_objectives using ((cycle_id IN ( SELECT evolution_cycles.id
   FROM evolution_cycles
  WHERE (evolution_cycles.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can view evolution objectives" on public.evolution_objectives using ((cycle_id IN ( SELECT evolution_cycles.id
   FROM evolution_cycles
  WHERE (evolution_cycles.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "super admin write llm mapping" on public.feature_llm_mapping using (is_super_admin((select auth.uid()))) with check (is_super_admin((select auth.uid())));
alter policy "Members can manage fees" on public.fees_historico using (((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = fees_historico.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members manage org garantias" on public.garantias_reposicao using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true))))) with check ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members view org garantias" on public.garantias_reposicao using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can insert performance reviews for their org" on public.hire_performance_reviews with check ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can update performance reviews of their org" on public.hire_performance_reviews using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can view performance reviews of their org" on public.hire_performance_reviews using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can create funnel stages" on public.hiring_funnel_stages with check ((EXISTS ( SELECT 1
   FROM hiring_funnels hf
  WHERE ((hf.id = hiring_funnel_stages.funnel_id) AND (is_account_member((select auth.uid()), hf.account_id) OR can_edit_client_project((select auth.uid()), hf.account_id))))));
alter policy "Members can delete funnel stages" on public.hiring_funnel_stages using ((EXISTS ( SELECT 1
   FROM hiring_funnels hf
  WHERE ((hf.id = hiring_funnel_stages.funnel_id) AND (is_account_member((select auth.uid()), hf.account_id) OR can_edit_client_project((select auth.uid()), hf.account_id))))));
alter policy "Members can update funnel stages" on public.hiring_funnel_stages using ((EXISTS ( SELECT 1
   FROM hiring_funnels hf
  WHERE ((hf.id = hiring_funnel_stages.funnel_id) AND (is_account_member((select auth.uid()), hf.account_id) OR can_edit_client_project((select auth.uid()), hf.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM hiring_funnels hf
  WHERE ((hf.id = hiring_funnel_stages.funnel_id) AND (is_account_member((select auth.uid()), hf.account_id) OR can_edit_client_project((select auth.uid()), hf.account_id))))));
alter policy "Members can view funnel stages" on public.hiring_funnel_stages using ((EXISTS ( SELECT 1
   FROM hiring_funnels hf
  WHERE ((hf.id = hiring_funnel_stages.funnel_id) AND (is_account_member((select auth.uid()), hf.account_id) OR can_edit_client_project((select auth.uid()), hf.account_id))))));
alter policy "Members can create account funnels" on public.hiring_funnels with check (is_account_member((select auth.uid()), account_id));
alter policy "Members can delete account funnels" on public.hiring_funnels using (is_account_member((select auth.uid()), account_id));
alter policy "Members can delete hiring funnels" on public.hiring_funnels using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can insert hiring funnels" on public.hiring_funnels with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update account funnels" on public.hiring_funnels using (is_account_member((select auth.uid()), account_id));
alter policy "Members can update hiring funnels" on public.hiring_funnels using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view account funnels" on public.hiring_funnels using (is_account_member((select auth.uid()), account_id));
alter policy "Members can view hiring funnels" on public.hiring_funnels using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can delete contact cache" on public.hunting_contact_cache using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can insert contact cache" on public.hunting_contact_cache with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update contact cache" on public.hunting_contact_cache using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view contact cache" on public.hunting_contact_cache using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view daily usage" on public.hunting_daily_usage using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can delete their org notifications" on public.hunting_notifications using (is_account_member((select auth.uid()), account_id));
alter policy "Members can insert notifications" on public.hunting_notifications with check (is_account_member((select auth.uid()), account_id));
alter policy "Members can update their org notifications" on public.hunting_notifications using (is_account_member((select auth.uid()), account_id));
alter policy "Members can view their org notifications" on public.hunting_notifications using (is_account_member((select auth.uid()), account_id));
alter policy "Members can create personas" on public.hunting_outreach_personas with check ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can delete their org personas" on public.hunting_outreach_personas using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can update their org personas" on public.hunting_outreach_personas using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can view their org personas" on public.hunting_outreach_personas using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can insert provider settings" on public.hunting_provider_settings with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update provider settings" on public.hunting_provider_settings using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view provider settings" on public.hunting_provider_settings using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can create templates" on public.hunting_search_templates with check (is_account_member((select auth.uid()), account_id));
alter policy "Account members can delete templates" on public.hunting_search_templates using (is_account_member((select auth.uid()), account_id));
alter policy "Account members can update templates" on public.hunting_search_templates using (is_account_member((select auth.uid()), account_id));
alter policy "Account members can view templates" on public.hunting_search_templates using (is_account_member((select auth.uid()), account_id));
alter policy "Members can delete from talent pool" on public.hunting_talent_pool using (is_account_member((select auth.uid()), account_id));
alter policy "Members can insert into talent pool" on public.hunting_talent_pool with check (is_account_member((select auth.uid()), account_id));
alter policy "Members can update talent pool" on public.hunting_talent_pool using (is_account_member((select auth.uid()), account_id));
alter policy "Members can view their org talent pool" on public.hunting_talent_pool using (is_account_member((select auth.uid()), account_id));
alter policy "Owner can insert impersonation logs" on public.impersonation_logs with check ((owner_id = (select auth.uid())));
alter policy "Owner can update own impersonation logs" on public.impersonation_logs using ((owner_id = (select auth.uid())));
alter policy "Owner can view own impersonation logs" on public.impersonation_logs using ((owner_id = (select auth.uid())));
alter policy "Users can delete own account plans" on public.implementation_plans using (is_account_member((select auth.uid()), account_id));
alter policy "Users can insert own account plans" on public.implementation_plans with check (is_account_member((select auth.uid()), account_id));
alter policy "Users can update own account plans" on public.implementation_plans using (is_account_member((select auth.uid()), account_id));
alter policy "Users can view own account plans" on public.implementation_plans using (is_account_member((select auth.uid()), account_id));
alter policy "Members and EP consultants can insert indeed config" on public.indeed_feed_config with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members and EP consultants can update indeed config" on public.indeed_feed_config using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members and EP consultants can view indeed config" on public.indeed_feed_config using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members and EP consultants can view indeed log" on public.indeed_submission_log using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can manage indicators history" on public.indicators_version_history using ((EXISTS ( SELECT 1
   FROM strategic_indicators
  WHERE ((strategic_indicators.id = indicators_version_history.session_id) AND is_account_member((select auth.uid()), strategic_indicators.account_id)))));
alter policy "Account members can insert attempt history" on public.interview_attempt_history with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can view attempt history" on public.interview_attempt_history using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can view interview token usage" on public.interview_token_usage using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Admins can delete intranet posts" on public.intranet_posts using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = intranet_posts.account_id) AND (am.user_id = (select auth.uid())) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])) AND (am.is_active = true)))));
alter policy "Admins can insert intranet posts" on public.intranet_posts with check ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = intranet_posts.account_id) AND (am.user_id = (select auth.uid())) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])) AND (am.is_active = true)))));
alter policy "Admins can update intranet posts" on public.intranet_posts using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = intranet_posts.account_id) AND (am.user_id = (select auth.uid())) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])) AND (am.is_active = true)))));
alter policy "Members can view intranet posts" on public.intranet_posts using (((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = intranet_posts.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))) AND ((expires_at IS NULL) OR (expires_at > now()))));
alter policy "Members can view job alert subscriptions" on public.job_alert_subscriptions using ((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.account_id = job_alert_subscriptions.account_id) AND (account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can create job descriptions for their account" on public.job_descriptions with check (((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can delete job descriptions from their account" on public.job_descriptions using (((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can update job descriptions from their account" on public.job_descriptions using (((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can view job descriptions from their account" on public.job_descriptions using (((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Admins can delete channels" on public.job_distribution_channels using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role, 'admin_rh'::account_role]))))));
alter policy "Members can insert channels" on public.job_distribution_channels with check ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can update channels" on public.job_distribution_channels using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can view their org channels" on public.job_distribution_channels using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can delete credentials" on public.job_distribution_credentials using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can insert credentials" on public.job_distribution_credentials with check ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can update credentials" on public.job_distribution_credentials using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can view credentials" on public.job_distribution_credentials using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Admins can insert job logs" on public.job_distribution_logs with check ((job_id IN ( SELECT recruitment_jobs.id
   FROM recruitment_jobs
  WHERE (recruitment_jobs.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role, 'admin_rh'::account_role]))))))));
alter policy "Admins can update job logs" on public.job_distribution_logs using ((job_id IN ( SELECT recruitment_jobs.id
   FROM recruitment_jobs
  WHERE (recruitment_jobs.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role, 'admin_rh'::account_role]))))))));
alter policy "Members can view their job logs" on public.job_distribution_logs using ((job_id IN ( SELECT recruitment_jobs.id
   FROM recruitment_jobs
  WHERE (recruitment_jobs.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))))));
alter policy "Users can delete job embeddings from their organization" on public.job_embeddings using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can insert job embeddings for their organization" on public.job_embeddings with check ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can update job embeddings in their organization" on public.job_embeddings using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can view job embeddings from their organization" on public.job_embeddings using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can manage job families of their account" on public.job_families using ((model_id IN ( SELECT compensation_models.id
   FROM compensation_models
  WHERE (compensation_models.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can view job families of their account" on public.job_families using ((model_id IN ( SELECT compensation_models.id
   FROM compensation_models
  WHERE (compensation_models.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can create ICPs for their accounts" on public.job_icps with check ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can delete ICPs for their accounts" on public.job_icps using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can update ICPs for their accounts" on public.job_icps using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can view ICPs for their accounts" on public.job_icps using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can delete progress for their company" on public.journey_progress using ((account_id IN ( SELECT p.account_id
   FROM profiles p
  WHERE (p.id = (select auth.uid())))));
alter policy "Users can insert progress for their company" on public.journey_progress with check ((account_id IN ( SELECT p.account_id
   FROM profiles p
  WHERE (p.id = (select auth.uid())))));
alter policy "Users can update progress for their company" on public.journey_progress using ((account_id IN ( SELECT p.account_id
   FROM profiles p
  WHERE (p.id = (select auth.uid())))));
alter policy "Users can view progress for their company" on public.journey_progress using ((account_id IN ( SELECT p.account_id
   FROM profiles p
  WHERE (p.id = (select auth.uid())))));
alter policy "Super admins manage lessons" on public.lessons using (is_super_admin((select auth.uid())));
alter policy "Users can manage level outcomes of their account" on public.level_outcomes using ((level_id IN ( SELECT pl.id
   FROM (((position_levels pl
     JOIN positions p ON ((p.id = pl.position_id)))
     JOIN job_families jf ON ((jf.id = p.family_id)))
     JOIN compensation_models cm ON ((cm.id = jf.model_id)))
  WHERE (cm.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can view level outcomes of their account" on public.level_outcomes using ((level_id IN ( SELECT pl.id
   FROM (((position_levels pl
     JOIN positions p ON ((p.id = pl.position_id)))
     JOIN job_families jf ON ((jf.id = p.family_id)))
     JOIN compensation_models cm ON ((cm.id = jf.model_id)))
  WHERE (cm.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "EP Team can create license history" on public.license_change_history with check ((EXISTS ( SELECT 1
   FROM ep_consultants
  WHERE ((ep_consultants.user_id = (select auth.uid())) AND (ep_consultants.active = true)))));
alter policy "EP Team can view license history" on public.license_change_history using ((EXISTS ( SELECT 1
   FROM ep_consultants
  WHERE ((ep_consultants.user_id = (select auth.uid())) AND (ep_consultants.active = true)))));
alter policy "EP Team can manage template modules" on public.license_template_modules using ((EXISTS ( SELECT 1
   FROM ep_consultants
  WHERE ((ep_consultants.user_id = (select auth.uid())) AND (ep_consultants.active = true)))));
alter policy "EP Team can manage templates" on public.license_templates using ((EXISTS ( SELECT 1
   FROM ep_consultants
  WHERE ((ep_consultants.user_id = (select auth.uid())) AND (ep_consultants.active = true)))));
alter policy "EP team can insert license snapshots" on public.license_usage_snapshots with check ((EXISTS ( SELECT 1
   FROM ep_consultants ec
  WHERE ((ec.user_id = (select auth.uid())) AND (ec.active = true)))));
alter policy "EP team can read license snapshots" on public.license_usage_snapshots using ((EXISTS ( SELECT 1
   FROM ep_consultants ec
  WHERE ((ec.user_id = (select auth.uid())) AND (ec.active = true)))));
alter policy "Account members can read batch jobs" on public.llm_batch_jobs using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id) OR is_super_admin((select auth.uid()))));
alter policy "Super admins can read snapshots" on public.llm_cost_monthly_snapshots using (is_super_admin((select auth.uid())));
alter policy "super admin read alerts" on public.llm_pricing_alerts using (is_super_admin((select auth.uid())));
alter policy "super admin write alerts" on public.llm_pricing_alerts using (is_super_admin((select auth.uid()))) with check (is_super_admin((select auth.uid())));
alter policy mrmc_admin_write on public.market_research_model_config using (is_super_admin((select auth.uid()))) with check (is_super_admin((select auth.uid())));
alter policy mrmc_read_super_admin on public.market_research_model_config using (is_super_admin((select auth.uid())));
alter policy mrp_admin_write on public.market_research_prompts using (is_super_admin((select auth.uid()))) with check (is_super_admin((select auth.uid())));
alter policy mrp_read_super_admin on public.market_research_prompts using (is_super_admin((select auth.uid())));
alter policy mrr_delete_members on public.market_research_reports using (is_account_member((select auth.uid()), account_id));
alter policy mrr_insert_members on public.market_research_reports with check ((is_account_member((select auth.uid()), account_id) AND (created_by = (select auth.uid()))));
alter policy mrr_select_members on public.market_research_reports using (is_account_member((select auth.uid()), account_id));
alter policy mrr_update_members on public.market_research_reports using (is_account_member((select auth.uid()), account_id));
alter policy "Participants can manage items" on public.meeting_one_on_one_items using ((EXISTS ( SELECT 1
   FROM meetings_one_on_one m
  WHERE ((m.id = meeting_one_on_one_items.meeting_id) AND ((m.manager_id = (select auth.uid())) OR (m.collaborator_id = (select auth.uid())))))));
alter policy "Users can view items of their meetings" on public.meeting_one_on_one_items using (((EXISTS ( SELECT 1
   FROM meetings_one_on_one m
  WHERE ((m.id = meeting_one_on_one_items.meeting_id) AND ((m.manager_id = (select auth.uid())) OR (m.collaborator_id = (select auth.uid())))))) OR (EXISTS ( SELECT 1
   FROM (meetings_one_on_one m
     JOIN account_members am ON ((am.account_id = m.account_id)))
  WHERE ((m.id = meeting_one_on_one_items.meeting_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])))))));
alter policy "Managers can manage recurrences" on public.meeting_one_on_one_recurrence using (((manager_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = meeting_one_on_one_recurrence.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])))))));
alter policy "Users can view their recurrences" on public.meeting_one_on_one_recurrence using (((manager_id = (select auth.uid())) OR (collaborator_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = meeting_one_on_one_recurrence.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])))))));
alter policy "Account admins can manage templates" on public.meeting_one_on_one_templates using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = meeting_one_on_one_templates.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role]))))));
alter policy "Templates are viewable by account members or global" on public.meeting_one_on_one_templates using (((account_id IS NULL) OR (EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = meeting_one_on_one_templates.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true))))));
alter policy "Managers can create meetings" on public.meetings_one_on_one with check (((manager_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = meetings_one_on_one.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])))))));
alter policy "Managers can delete meetings" on public.meetings_one_on_one using (((manager_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = meetings_one_on_one.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])))))));
alter policy "Managers can update meetings" on public.meetings_one_on_one using (((manager_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = meetings_one_on_one.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])))))));
alter policy "Users can view their meetings" on public.meetings_one_on_one using (((manager_id = (select auth.uid())) OR (collaborator_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = meetings_one_on_one.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])))))));
alter policy "Members can create account mission sessions" on public.mission_sessions with check ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can delete account mission sessions" on public.mission_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can update account mission sessions" on public.mission_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view account mission sessions" on public.mission_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can manage own mission history" on public.mission_version_history using ((EXISTS ( SELECT 1
   FROM mission_sessions
  WHERE ((mission_sessions.id = mission_version_history.session_id) AND (mission_sessions.user_id = (select auth.uid()))))));
alter policy "Members can delete module versions" on public.module_version_history using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can insert module versions" on public.module_version_history with check (((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)) AND (created_by = (select auth.uid()))));
alter policy "Members can view module versions" on public.module_version_history using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can manage their own preferences" on public.notification_preferences using (((select auth.uid()) = user_id));
alter policy "Users can view their own preferences" on public.notification_preferences using (((select auth.uid()) = user_id));
alter policy "Users can update their own notification recipients" on public.notification_recipients using (((select auth.uid()) = user_id));
alter policy "Users can view their own notification recipients" on public.notification_recipients using (((select auth.uid()) = user_id));
alter policy "Users can update their notifications" on public.notifications using ((user_id = (select auth.uid())));
alter policy "Users can view relevant notifications" on public.notifications using (((user_id = (select auth.uid())) OR is_super_admin((select auth.uid())) OR ((org_id IS NOT NULL) AND is_account_member((select auth.uid()), org_id)) OR (EXISTS ( SELECT 1
   FROM notification_recipients nr
  WHERE ((nr.notification_id = nr.id) AND (nr.user_id = (select auth.uid())))))));
alter policy "Users can update their offboarding tasks" on public.offboarding_tasks using (((responsible_user_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM offboarding_cases c
  WHERE ((c.id = offboarding_tasks.case_id) AND user_has_role_in_account(c.account_id, ARRAY['owner'::text, 'admin'::text]))))));
alter policy "Users can view offboarding tasks" on public.offboarding_tasks using (((EXISTS ( SELECT 1
   FROM offboarding_cases c
  WHERE ((c.id = offboarding_tasks.case_id) AND user_has_account_access(c.account_id)))) OR (responsible_user_id = (select auth.uid()))));
alter policy "Account members can insert offline uploads" on public.offline_interview_uploads with check ((is_account_member((select auth.uid()), account_id) AND (created_by = (select auth.uid()))));
alter policy "Account members can update offline uploads" on public.offline_interview_uploads using (is_account_member((select auth.uid()), account_id));
alter policy "Account members can view offline uploads" on public.offline_interview_uploads using (is_account_member((select auth.uid()), account_id));
alter policy "Alerts manageable by involved users" on public.onboarding_alerts using ((EXISTS ( SELECT 1
   FROM onboarding_processes op
  WHERE ((op.id = onboarding_alerts.process_id) AND (((select auth.uid()) = op.created_by) OR ((select auth.uid()) = op.leader_id) OR ((select auth.uid()) = op.hr_responsible_id) OR is_super_admin((select auth.uid())))))));
alter policy "Alerts viewable by involved users" on public.onboarding_alerts using ((EXISTS ( SELECT 1
   FROM onboarding_processes op
  WHERE ((op.id = onboarding_alerts.process_id) AND (((select auth.uid()) = op.created_by) OR ((select auth.uid()) = op.leader_id) OR ((select auth.uid()) = op.hr_responsible_id) OR is_super_admin((select auth.uid())))))));
alter policy "Checkpoint responses insertable by involved users" on public.onboarding_checkpoint_responses with check ((EXISTS ( SELECT 1
   FROM (onboarding_checkpoints oc
     JOIN onboarding_processes op ON ((op.id = oc.process_id)))
  WHERE ((oc.id = onboarding_checkpoint_responses.checkpoint_id) AND (((select auth.uid()) = op.created_by) OR ((select auth.uid()) = op.leader_id) OR ((select auth.uid()) = op.hr_responsible_id) OR is_super_admin((select auth.uid())))))));
alter policy "Checkpoint responses updatable by respondent or admins" on public.onboarding_checkpoint_responses using (((respondent_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM (onboarding_checkpoints oc
     JOIN onboarding_processes op ON ((op.id = oc.process_id)))
  WHERE ((oc.id = onboarding_checkpoint_responses.checkpoint_id) AND (((select auth.uid()) = op.created_by) OR ((select auth.uid()) = op.hr_responsible_id) OR is_super_admin((select auth.uid()))))))));
alter policy "Checkpoint responses viewable by involved users" on public.onboarding_checkpoint_responses using ((EXISTS ( SELECT 1
   FROM (onboarding_checkpoints oc
     JOIN onboarding_processes op ON ((op.id = oc.process_id)))
  WHERE ((oc.id = onboarding_checkpoint_responses.checkpoint_id) AND (((select auth.uid()) = op.created_by) OR ((select auth.uid()) = op.leader_id) OR ((select auth.uid()) = op.hr_responsible_id) OR is_super_admin((select auth.uid())))))));
alter policy "Checkpoints manageable by involved users" on public.onboarding_checkpoints using ((EXISTS ( SELECT 1
   FROM onboarding_processes op
  WHERE ((op.id = onboarding_checkpoints.process_id) AND (((select auth.uid()) = op.created_by) OR ((select auth.uid()) = op.leader_id) OR ((select auth.uid()) = op.hr_responsible_id) OR is_super_admin((select auth.uid())))))));
alter policy "Checkpoints viewable by involved users" on public.onboarding_checkpoints using ((EXISTS ( SELECT 1
   FROM onboarding_processes op
  WHERE ((op.id = onboarding_checkpoints.process_id) AND (((select auth.uid()) = op.created_by) OR ((select auth.uid()) = op.leader_id) OR ((select auth.uid()) = op.hr_responsible_id) OR is_super_admin((select auth.uid())))))));
alter policy "Involved users can delete assessments" on public.onboarding_competency_assessments using ((EXISTS ( SELECT 1
   FROM onboarding_processes op
  WHERE ((op.id = onboarding_competency_assessments.process_id) AND (((select auth.uid()) = op.created_by) OR ((select auth.uid()) = op.leader_id) OR ((select auth.uid()) = op.hr_responsible_id) OR is_super_admin((select auth.uid())))))));
alter policy "Involved users can insert assessments" on public.onboarding_competency_assessments with check ((EXISTS ( SELECT 1
   FROM onboarding_processes op
  WHERE ((op.id = onboarding_competency_assessments.process_id) AND (((select auth.uid()) = op.created_by) OR ((select auth.uid()) = op.leader_id) OR ((select auth.uid()) = op.hr_responsible_id) OR is_super_admin((select auth.uid())))))));
alter policy "Involved users can update assessments" on public.onboarding_competency_assessments using ((EXISTS ( SELECT 1
   FROM onboarding_processes op
  WHERE ((op.id = onboarding_competency_assessments.process_id) AND (((select auth.uid()) = op.created_by) OR ((select auth.uid()) = op.leader_id) OR ((select auth.uid()) = op.hr_responsible_id) OR is_super_admin((select auth.uid()))))))) with check ((EXISTS ( SELECT 1
   FROM onboarding_processes op
  WHERE ((op.id = onboarding_competency_assessments.process_id) AND (((select auth.uid()) = op.created_by) OR ((select auth.uid()) = op.leader_id) OR ((select auth.uid()) = op.hr_responsible_id) OR is_super_admin((select auth.uid())))))));
alter policy "Evaluations are viewable by process participants" on public.onboarding_evaluations using ((EXISTS ( SELECT 1
   FROM onboarding_processes p
  WHERE ((p.id = onboarding_evaluations.process_id) AND (((select auth.uid()) = p.created_by) OR ((select auth.uid()) = p.leader_id) OR ((select auth.uid()) = p.hr_responsible_id))))));
alter policy "Participants can create evaluations" on public.onboarding_evaluations with check ((EXISTS ( SELECT 1
   FROM onboarding_processes p
  WHERE ((p.id = onboarding_evaluations.process_id) AND (((select auth.uid()) = p.created_by) OR ((select auth.uid()) = p.leader_id) OR ((select auth.uid()) = p.hr_responsible_id))))));
alter policy "Participants can manage phases" on public.onboarding_phases using ((EXISTS ( SELECT 1
   FROM onboarding_processes p
  WHERE ((p.id = onboarding_phases.process_id) AND (((select auth.uid()) = p.created_by) OR ((select auth.uid()) = p.leader_id) OR ((select auth.uid()) = p.hr_responsible_id))))));
alter policy "Phases are viewable by process participants" on public.onboarding_phases using ((EXISTS ( SELECT 1
   FROM onboarding_processes p
  WHERE ((p.id = onboarding_phases.process_id) AND (((select auth.uid()) = p.created_by) OR ((select auth.uid()) = p.leader_id) OR ((select auth.uid()) = p.hr_responsible_id))))));
alter policy "Involved users can update processes" on public.onboarding_processes using ((((select auth.uid()) = created_by) OR ((select auth.uid()) = leader_id) OR ((select auth.uid()) = hr_responsible_id)));
alter policy "Processes are viewable by involved users" on public.onboarding_processes using ((((select auth.uid()) = created_by) OR ((select auth.uid()) = leader_id) OR ((select auth.uid()) = hr_responsible_id)));
alter policy "Users can create processes" on public.onboarding_processes with check (((select auth.uid()) = created_by));
alter policy "Success metrics manageable by involved users" on public.onboarding_success_metrics using ((EXISTS ( SELECT 1
   FROM onboarding_processes op
  WHERE ((op.id = onboarding_success_metrics.process_id) AND (((select auth.uid()) = op.created_by) OR ((select auth.uid()) = op.leader_id) OR ((select auth.uid()) = op.hr_responsible_id) OR is_super_admin((select auth.uid())))))));
alter policy "Success metrics viewable by involved users" on public.onboarding_success_metrics using ((EXISTS ( SELECT 1
   FROM onboarding_processes op
  WHERE ((op.id = onboarding_success_metrics.process_id) AND (((select auth.uid()) = op.created_by) OR ((select auth.uid()) = op.leader_id) OR ((select auth.uid()) = op.hr_responsible_id) OR is_super_admin((select auth.uid())))))));
alter policy "Participants can manage tasks" on public.onboarding_tasks using ((EXISTS ( SELECT 1
   FROM onboarding_processes p
  WHERE ((p.id = onboarding_tasks.process_id) AND (((select auth.uid()) = p.created_by) OR ((select auth.uid()) = p.leader_id) OR ((select auth.uid()) = p.hr_responsible_id))))));
alter policy "Tasks are viewable by process participants" on public.onboarding_tasks using ((EXISTS ( SELECT 1
   FROM onboarding_processes p
  WHERE ((p.id = onboarding_tasks.process_id) AND (((select auth.uid()) = p.created_by) OR ((select auth.uid()) = p.leader_id) OR ((select auth.uid()) = p.hr_responsible_id))))));
alter policy "Users can manage template phases" on public.onboarding_template_phases using ((EXISTS ( SELECT 1
   FROM onboarding_templates t
  WHERE ((t.id = onboarding_template_phases.template_id) AND (t.created_by = (select auth.uid()))))));
alter policy "Users can manage template tasks" on public.onboarding_template_tasks using ((EXISTS ( SELECT 1
   FROM (onboarding_template_phases p
     JOIN onboarding_templates t ON ((t.id = p.template_id)))
  WHERE ((p.id = onboarding_template_tasks.phase_id) AND (t.created_by = (select auth.uid()))))));
alter policy "Users can create templates" on public.onboarding_templates with check (((select auth.uid()) = created_by));
alter policy "Users can delete their templates" on public.onboarding_templates using (((select auth.uid()) = created_by));
alter policy "Users can update their templates" on public.onboarding_templates using (((select auth.uid()) = created_by));
alter policy org_admins_can_manage_auto_recharge on public.org_auto_recharge_settings using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = org_auto_recharge_settings.org_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])))))) with check ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = org_auto_recharge_settings.org_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role]))))));
alter policy org_members_can_read_auto_recharge on public.org_auto_recharge_settings using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = org_auto_recharge_settings.org_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy org_billing_insert on public.org_billing with check ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy org_billing_select on public.org_billing using ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid())) OR is_account_member((select auth.uid()), org_id)));
alter policy org_billing_update on public.org_billing using ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy "Users can delete connections in their org charts" on public.org_chart_connections using ((chart_id IN ( SELECT org_charts.id
   FROM org_charts
  WHERE (org_charts.account_id IN ( SELECT profiles.account_id
           FROM profiles
          WHERE (profiles.id = (select auth.uid())))))));
alter policy "Users can insert connections in their org charts" on public.org_chart_connections with check ((chart_id IN ( SELECT org_charts.id
   FROM org_charts
  WHERE (org_charts.account_id IN ( SELECT profiles.account_id
           FROM profiles
          WHERE (profiles.id = (select auth.uid())))))));
alter policy "Users can update connections in their org charts" on public.org_chart_connections using ((chart_id IN ( SELECT org_charts.id
   FROM org_charts
  WHERE (org_charts.account_id IN ( SELECT profiles.account_id
           FROM profiles
          WHERE (profiles.id = (select auth.uid())))))));
alter policy "Users can view connections of their org charts" on public.org_chart_connections using ((chart_id IN ( SELECT org_charts.id
   FROM org_charts
  WHERE (org_charts.account_id IN ( SELECT profiles.account_id
           FROM profiles
          WHERE (profiles.id = (select auth.uid())))))));
alter policy "Delete org chart nodes (members + consultants)" on public.org_chart_nodes using ((EXISTS ( SELECT 1
   FROM org_charts oc
  WHERE ((oc.id = org_chart_nodes.chart_id) AND (is_account_member((select auth.uid()), oc.account_id) OR can_edit_client_project((select auth.uid()), oc.account_id))))));
alter policy "Insert org chart nodes (members + consultants)" on public.org_chart_nodes with check ((EXISTS ( SELECT 1
   FROM org_charts oc
  WHERE ((oc.id = org_chart_nodes.chart_id) AND (is_account_member((select auth.uid()), oc.account_id) OR can_edit_client_project((select auth.uid()), oc.account_id))))));
alter policy "Members can create org chart nodes" on public.org_chart_nodes with check ((EXISTS ( SELECT 1
   FROM org_charts oc
  WHERE ((oc.id = org_chart_nodes.chart_id) AND is_account_member((select auth.uid()), oc.account_id)))));
alter policy "Members can delete org chart nodes" on public.org_chart_nodes using ((EXISTS ( SELECT 1
   FROM org_charts oc
  WHERE ((oc.id = org_chart_nodes.chart_id) AND is_account_member((select auth.uid()), oc.account_id)))));
alter policy "Members can update org chart nodes" on public.org_chart_nodes using ((EXISTS ( SELECT 1
   FROM org_charts oc
  WHERE ((oc.id = org_chart_nodes.chart_id) AND is_account_member((select auth.uid()), oc.account_id)))));
alter policy "Members can view org chart nodes" on public.org_chart_nodes using ((EXISTS ( SELECT 1
   FROM org_charts oc
  WHERE ((oc.id = org_chart_nodes.chart_id) AND is_account_member((select auth.uid()), oc.account_id)))));
alter policy "Update org chart nodes (members + consultants)" on public.org_chart_nodes using ((EXISTS ( SELECT 1
   FROM org_charts oc
  WHERE ((oc.id = org_chart_nodes.chart_id) AND (is_account_member((select auth.uid()), oc.account_id) OR can_edit_client_project((select auth.uid()), oc.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM org_charts oc
  WHERE ((oc.id = org_chart_nodes.chart_id) AND (is_account_member((select auth.uid()), oc.account_id) OR can_edit_client_project((select auth.uid()), oc.account_id))))));
alter policy "View org chart nodes (members + consultants)" on public.org_chart_nodes using ((EXISTS ( SELECT 1
   FROM org_charts oc
  WHERE ((oc.id = org_chart_nodes.chart_id) AND (is_account_member((select auth.uid()), oc.account_id) OR can_edit_client_project((select auth.uid()), oc.account_id))))));
alter policy "Members can create account org charts" on public.org_charts with check (is_account_member((select auth.uid()), account_id));
alter policy "Members can delete account org charts" on public.org_charts using (is_account_member((select auth.uid()), account_id));
alter policy "Members can delete org charts" on public.org_charts using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can insert org charts" on public.org_charts with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update account org charts" on public.org_charts using (is_account_member((select auth.uid()), account_id));
alter policy "Members can update org charts" on public.org_charts using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view account org charts" on public.org_charts using (is_account_member((select auth.uid()), account_id));
alter policy "Members can view org charts" on public.org_charts using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view own org credit subscriptions" on public.org_credit_subscriptions using (is_account_member((select auth.uid()), org_id));
alter policy "Admins can delete org events" on public.org_events using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = org_events.account_id) AND (am.user_id = (select auth.uid())) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])) AND (am.is_active = true)))));
alter policy "Admins can insert org events" on public.org_events with check ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = org_events.account_id) AND (am.user_id = (select auth.uid())) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])) AND (am.is_active = true)))));
alter policy "Admins can update org events" on public.org_events using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = org_events.account_id) AND (am.user_id = (select auth.uid())) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])) AND (am.is_active = true)))));
alter policy "Members can view org events" on public.org_events using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = org_events.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Super admins can view all seat grants" on public.org_seat_grants using ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = ANY (ARRAY['super_admin'::app_role, 'head_cs'::app_role]))))));
alter policy org_seats_insert on public.org_seats with check ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy org_seats_select on public.org_seats using ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid())) OR is_account_admin_or_owner((select auth.uid()), org_id)));
alter policy org_seats_update on public.org_seats using ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy "Organization admins can delete API keys" on public.organization_api_keys using (((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.account_id = organization_api_keys.account_id) AND (account_members.user_id = (select auth.uid())) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role]))))) OR (EXISTS ( SELECT 1
   FROM companies
  WHERE ((companies.id = organization_api_keys.account_id) AND (companies.user_id = (select auth.uid())))))));
alter policy "Organization admins can insert API keys" on public.organization_api_keys with check (((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.account_id = organization_api_keys.account_id) AND (account_members.user_id = (select auth.uid())) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role]))))) OR (EXISTS ( SELECT 1
   FROM companies
  WHERE ((companies.id = organization_api_keys.account_id) AND (companies.user_id = (select auth.uid())))))));
alter policy "Organization members can view API keys" on public.organization_api_keys using (((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.account_id = organization_api_keys.account_id) AND (account_members.user_id = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM companies
  WHERE ((companies.id = organization_api_keys.account_id) AND (companies.user_id = (select auth.uid())))))));
alter policy "Organization admins can delete webhooks" on public.organization_webhooks using (((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.account_id = organization_webhooks.account_id) AND (account_members.user_id = (select auth.uid())) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role]))))) OR (EXISTS ( SELECT 1
   FROM companies
  WHERE ((companies.id = organization_webhooks.account_id) AND (companies.user_id = (select auth.uid())))))));
alter policy "Organization admins can insert webhooks" on public.organization_webhooks with check (((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.account_id = organization_webhooks.account_id) AND (account_members.user_id = (select auth.uid())) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role]))))) OR (EXISTS ( SELECT 1
   FROM companies
  WHERE ((companies.id = organization_webhooks.account_id) AND (companies.user_id = (select auth.uid())))))));
alter policy "Organization admins can update webhooks" on public.organization_webhooks using (((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.account_id = organization_webhooks.account_id) AND (account_members.user_id = (select auth.uid())) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role]))))) OR (EXISTS ( SELECT 1
   FROM companies
  WHERE ((companies.id = organization_webhooks.account_id) AND (companies.user_id = (select auth.uid())))))));
alter policy "Organization members can view webhooks" on public.organization_webhooks using (((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.account_id = organization_webhooks.account_id) AND (account_members.user_id = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM companies
  WHERE ((companies.id = organization_webhooks.account_id) AND (companies.user_id = (select auth.uid())))))));
alter policy partner_client_grants_select on public.partner_client_grants using ((is_super_admin((select auth.uid())) OR (user_id = (select auth.uid())) OR (partner_id IN ( SELECT ep_partners.id
   FROM ep_partners
  WHERE (ep_partners.user_id = (select auth.uid()))))));
alter policy "EP Partners can view their own direct sales" on public.partner_direct_sales using ((partner_id IN ( SELECT ep_partners.id
   FROM ep_partners
  WHERE (ep_partners.user_id = (select auth.uid())))));
alter policy "Partners can view own direct sales" on public.partner_direct_sales using ((partner_id IN ( SELECT ep_partners.id
   FROM ep_partners
  WHERE (ep_partners.user_id = (select auth.uid())))));
alter policy "Super admins and head_cs can manage direct sales" on public.partner_direct_sales using ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = ANY (ARRAY['super_admin'::app_role, 'head_cs'::app_role])))))) with check ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = ANY (ARRAY['super_admin'::app_role, 'head_cs'::app_role]))))));
alter policy "Super admins can manage direct sales" on public.partner_direct_sales using (has_role((select auth.uid()), 'super_admin'::app_role));
alter policy partner_licenses_select on public.partner_licenses using ((is_super_admin((select auth.uid())) OR (partner_id IN ( SELECT ep_partners.id
   FROM ep_partners
  WHERE (ep_partners.user_id = (select auth.uid()))))));
alter policy partner_royalties_select on public.partner_royalties using ((is_super_admin((select auth.uid())) OR (partner_id IN ( SELECT ep_partners.id
   FROM ep_partners
  WHERE (ep_partners.user_id = (select auth.uid()))))));
alter policy "Admins can create account analyses" on public.people_analyses with check (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Admins can delete account analyses" on public.people_analyses using (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Admins can update account analyses" on public.people_analyses using (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Admins can view account analyses" on public.people_analyses using (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Members can delete people analyses" on public.people_analyses using ((is_account_admin_or_owner((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can insert people analyses" on public.people_analyses with check ((is_account_admin_or_owner((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update people analyses" on public.people_analyses using ((is_account_admin_or_owner((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_admin_or_owner((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view people analyses" on public.people_analyses using ((is_account_admin_or_owner((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Admins can create analysis members" on public.people_analysis_members with check ((EXISTS ( SELECT 1
   FROM people_analyses pa
  WHERE ((pa.id = people_analysis_members.analysis_id) AND (is_account_admin_or_owner((select auth.uid()), pa.account_id) OR can_edit_client_project((select auth.uid()), pa.account_id))))));
alter policy "Admins can delete analysis members" on public.people_analysis_members using ((EXISTS ( SELECT 1
   FROM people_analyses pa
  WHERE ((pa.id = people_analysis_members.analysis_id) AND (is_account_admin_or_owner((select auth.uid()), pa.account_id) OR can_edit_client_project((select auth.uid()), pa.account_id))))));
alter policy "Admins can update analysis members" on public.people_analysis_members using ((EXISTS ( SELECT 1
   FROM people_analyses pa
  WHERE ((pa.id = people_analysis_members.analysis_id) AND (is_account_admin_or_owner((select auth.uid()), pa.account_id) OR can_edit_client_project((select auth.uid()), pa.account_id))))));
alter policy "Admins can view analysis members" on public.people_analysis_members using ((EXISTS ( SELECT 1
   FROM people_analyses pa
  WHERE ((pa.id = people_analysis_members.analysis_id) AND (is_account_admin_or_owner((select auth.uid()), pa.account_id) OR can_edit_client_project((select auth.uid()), pa.account_id))))));
alter policy "Admins can create analysis ratings" on public.people_analysis_ratings with check ((EXISTS ( SELECT 1
   FROM (people_analysis_members pam
     JOIN people_analyses pa ON ((pa.id = pam.analysis_id)))
  WHERE ((pam.id = people_analysis_ratings.member_id) AND (is_account_admin_or_owner((select auth.uid()), pa.account_id) OR can_edit_client_project((select auth.uid()), pa.account_id))))));
alter policy "Admins can delete analysis ratings" on public.people_analysis_ratings using ((EXISTS ( SELECT 1
   FROM (people_analysis_members pam
     JOIN people_analyses pa ON ((pa.id = pam.analysis_id)))
  WHERE ((pam.id = people_analysis_ratings.member_id) AND (is_account_admin_or_owner((select auth.uid()), pa.account_id) OR can_edit_client_project((select auth.uid()), pa.account_id))))));
alter policy "Admins can update analysis ratings" on public.people_analysis_ratings using ((EXISTS ( SELECT 1
   FROM (people_analysis_members pam
     JOIN people_analyses pa ON ((pa.id = pam.analysis_id)))
  WHERE ((pam.id = people_analysis_ratings.member_id) AND (is_account_admin_or_owner((select auth.uid()), pa.account_id) OR can_edit_client_project((select auth.uid()), pa.account_id))))));
alter policy "Admins can view analysis ratings" on public.people_analysis_ratings using ((EXISTS ( SELECT 1
   FROM (people_analysis_members pam
     JOIN people_analyses pa ON ((pa.id = pam.analysis_id)))
  WHERE ((pam.id = people_analysis_ratings.member_id) AND (is_account_admin_or_owner((select auth.uid()), pa.account_id) OR can_edit_client_project((select auth.uid()), pa.account_id))))));
alter policy "Admins can create analysis version history" on public.people_analysis_version_history with check ((EXISTS ( SELECT 1
   FROM people_analyses pa
  WHERE ((pa.id = people_analysis_version_history.analysis_id) AND (is_account_admin_or_owner((select auth.uid()), pa.account_id) OR can_edit_client_project((select auth.uid()), pa.account_id))))));
alter policy "Admins can delete analysis version history" on public.people_analysis_version_history using ((EXISTS ( SELECT 1
   FROM people_analyses pa
  WHERE ((pa.id = people_analysis_version_history.analysis_id) AND (is_account_admin_or_owner((select auth.uid()), pa.account_id) OR can_edit_client_project((select auth.uid()), pa.account_id))))));
alter policy "Admins can view analysis version history" on public.people_analysis_version_history using ((EXISTS ( SELECT 1
   FROM people_analyses pa
  WHERE ((pa.id = people_analysis_version_history.analysis_id) AND (is_account_admin_or_owner((select auth.uid()), pa.account_id) OR can_edit_client_project((select auth.uid()), pa.account_id))))));
alter policy "Admins can create assessment points" on public.performance_assessment_points with check ((EXISTS ( SELECT 1
   FROM performance_assessments pa
  WHERE ((pa.id = performance_assessment_points.assessment_id) AND is_account_admin_or_owner((select auth.uid()), pa.account_id)))));
alter policy "Admins can delete assessment points" on public.performance_assessment_points using ((EXISTS ( SELECT 1
   FROM performance_assessments pa
  WHERE ((pa.id = performance_assessment_points.assessment_id) AND is_account_admin_or_owner((select auth.uid()), pa.account_id)))));
alter policy "Admins can update assessment points" on public.performance_assessment_points using ((EXISTS ( SELECT 1
   FROM performance_assessments pa
  WHERE ((pa.id = performance_assessment_points.assessment_id) AND is_account_admin_or_owner((select auth.uid()), pa.account_id)))));
alter policy "Admins can view assessment points" on public.performance_assessment_points using ((EXISTS ( SELECT 1
   FROM performance_assessments pa
  WHERE ((pa.id = performance_assessment_points.assessment_id) AND is_account_admin_or_owner((select auth.uid()), pa.account_id)))));
alter policy "Admins can create assessment version history" on public.performance_assessment_version_history with check ((EXISTS ( SELECT 1
   FROM performance_assessments pa
  WHERE ((pa.id = performance_assessment_version_history.assessment_id) AND is_account_admin_or_owner((select auth.uid()), pa.account_id)))));
alter policy "Admins can delete assessment version history" on public.performance_assessment_version_history using ((EXISTS ( SELECT 1
   FROM performance_assessments pa
  WHERE ((pa.id = performance_assessment_version_history.assessment_id) AND is_account_admin_or_owner((select auth.uid()), pa.account_id)))));
alter policy "Admins can view assessment version history" on public.performance_assessment_version_history using ((EXISTS ( SELECT 1
   FROM performance_assessments pa
  WHERE ((pa.id = performance_assessment_version_history.assessment_id) AND is_account_admin_or_owner((select auth.uid()), pa.account_id)))));
alter policy "Admins can create performance assessments" on public.performance_assessments with check (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Admins can delete performance assessments" on public.performance_assessments using (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Admins can update performance assessments" on public.performance_assessments using (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Admins can view performance assessments" on public.performance_assessments using (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Members can delete performance assessments" on public.performance_assessments using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can insert performance assessments" on public.performance_assessments with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update performance assessments" on public.performance_assessments using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view performance assessments" on public.performance_assessments using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Admins can manage account templates" on public.permission_templates using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])))))) with check ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role]))))));
alter policy "Users can read system defaults and own account templates" on public.permission_templates using (((is_system_default = true) OR (account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid()))))));
alter policy "EP Partners admins can update AI config" on public.platform_ai_model_config using ((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.account_id = '67f66f7a-d9a8-455e-8820-ee836cfe7401'::uuid) AND (account_members.is_active = true) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role]))))));
alter policy "EP Partners members can read AI config" on public.platform_ai_model_config using ((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.account_id = '67f66f7a-d9a8-455e-8820-ee836cfe7401'::uuid) AND (account_members.is_active = true)))));
alter policy "Super admins can insert credit config" on public.platform_credit_config with check ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy "Super admins can update credit config" on public.platform_credit_config using ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid())))) with check ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy super_admin_insert_email_config on public.platform_email_config with check (is_super_admin((select auth.uid())));
alter policy super_admin_select_email_config on public.platform_email_config using (is_super_admin((select auth.uid())));
alter policy super_admin_update_email_config on public.platform_email_config using (is_super_admin((select auth.uid())));
alter policy "Super admins can read settings" on public.platform_evaluation_settings using (has_role((select auth.uid()), 'super_admin'::app_role));
alter policy "Super admins can write settings" on public.platform_evaluation_settings using (has_role((select auth.uid()), 'super_admin'::app_role)) with check (has_role((select auth.uid()), 'super_admin'::app_role));
alter policy "Super admins can update platform_stripe_config" on public.platform_stripe_config using (is_super_admin((select auth.uid()))) with check (is_super_admin((select auth.uid())));
alter policy "Super admins can view platform_stripe_config" on public.platform_stripe_config using (is_super_admin((select auth.uid())));
alter policy super_admin_insert_whatsapp_config on public.platform_whatsapp_config with check (is_super_admin((select auth.uid())));
alter policy super_admin_select_whatsapp_config on public.platform_whatsapp_config using (is_super_admin((select auth.uid())));
alter policy super_admin_update_whatsapp_config on public.platform_whatsapp_config using (is_super_admin((select auth.uid())));
alter policy "Manage checklist items for admins" on public.playbook_checklist_items using ((EXISTS ( SELECT 1
   FROM ep_consultants ec
  WHERE ((ec.user_id = (select auth.uid())) AND (ec.active = true)))));
alter policy "View checklist items of accessible playbooks" on public.playbook_checklist_items using ((EXISTS ( SELECT 1
   FROM (((playbook_milestones pm
     JOIN playbook_phases pp ON ((pp.id = pm.phase_id)))
     JOIN project_playbooks pb ON ((pb.id = pp.playbook_id)))
     JOIN ep_consultants ec ON (((ec.user_id = (select auth.uid())) AND (ec.active = true))))
  WHERE ((pm.id = playbook_checklist_items.milestone_id) AND (pb.is_active = true)))));
alter policy "Manage guides for admins" on public.playbook_guides using ((EXISTS ( SELECT 1
   FROM ep_consultants ec
  WHERE ((ec.user_id = (select auth.uid())) AND (ec.active = true)))));
alter policy "View guides of accessible playbooks" on public.playbook_guides using ((EXISTS ( SELECT 1
   FROM (project_playbooks pb
     JOIN ep_consultants ec ON (((ec.user_id = (select auth.uid())) AND (ec.active = true))))
  WHERE ((pb.id = playbook_guides.playbook_id) AND (pb.is_active = true)))));
alter policy "Manage milestones for admins" on public.playbook_milestones using ((EXISTS ( SELECT 1
   FROM ep_consultants ec
  WHERE ((ec.user_id = (select auth.uid())) AND (ec.active = true)))));
alter policy "View milestones of accessible playbooks" on public.playbook_milestones using ((EXISTS ( SELECT 1
   FROM ((playbook_phases pp
     JOIN project_playbooks pb ON ((pb.id = pp.playbook_id)))
     JOIN ep_consultants ec ON (((ec.user_id = (select auth.uid())) AND (ec.active = true))))
  WHERE ((pp.id = playbook_milestones.phase_id) AND (pb.is_active = true)))));
alter policy "Manage phases for admins" on public.playbook_phases using ((EXISTS ( SELECT 1
   FROM ep_consultants ec
  WHERE ((ec.user_id = (select auth.uid())) AND (ec.active = true)))));
alter policy "View phases of accessible playbooks" on public.playbook_phases using ((EXISTS ( SELECT 1
   FROM (project_playbooks pb
     JOIN ep_consultants ec ON (((ec.user_id = (select auth.uid())) AND (ec.active = true))))
  WHERE ((pb.id = playbook_phases.playbook_id) AND (pb.is_active = true)))));
alter policy "Members can manage portal access" on public.portal_clientes_acesso using (((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = portal_clientes_acesso.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can manage feedbacks" on public.portal_feedbacks using (((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = portal_feedbacks.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can manage position levels of their account" on public.position_levels using ((position_id IN ( SELECT p.id
   FROM ((positions p
     JOIN job_families jf ON ((jf.id = p.family_id)))
     JOIN compensation_models cm ON ((cm.id = jf.model_id)))
  WHERE (cm.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can view position levels of their account" on public.position_levels using ((position_id IN ( SELECT p.id
   FROM ((positions p
     JOIN job_families jf ON ((jf.id = p.family_id)))
     JOIN compensation_models cm ON ((cm.id = jf.model_id)))
  WHERE (cm.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can manage positions of their account" on public.positions using ((family_id IN ( SELECT jf.id
   FROM (job_families jf
     JOIN compensation_models cm ON ((cm.id = jf.model_id)))
  WHERE (cm.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can view positions of their account" on public.positions using ((family_id IN ( SELECT jf.id
   FROM (job_families jf
     JOIN compensation_models cm ON ((cm.id = jf.model_id)))
  WHERE (cm.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can create comments" on public.post_comments with check ((((select auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM (intranet_posts p
     JOIN account_members am ON ((am.account_id = p.account_id)))
  WHERE ((p.id = post_comments.post_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true))))));
alter policy "Users can delete their own comments" on public.post_comments using (((select auth.uid()) = user_id));
alter policy "Users can update their own comments" on public.post_comments using (((select auth.uid()) = user_id));
alter policy "Users can view comments in their org posts" on public.post_comments using ((EXISTS ( SELECT 1
   FROM (intranet_posts p
     JOIN account_members am ON ((am.account_id = p.account_id)))
  WHERE ((p.id = post_comments.post_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Account members can create post hire checklist items" on public.post_hire_checklist_items with check ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = post_hire_checklist_items.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Account members can delete post hire checklist items" on public.post_hire_checklist_items using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = post_hire_checklist_items.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Account members can update post hire checklist items" on public.post_hire_checklist_items using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = post_hire_checklist_items.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true))))) with check ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = post_hire_checklist_items.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Authorized users can view post hire checklist items" on public.post_hire_checklist_items using ((EXISTS ( SELECT 1
   FROM post_hire_checklists phc
  WHERE ((phc.id = post_hire_checklist_items.checklist_id) AND ((EXISTS ( SELECT 1
           FROM account_members am
          WHERE ((am.account_id = phc.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))) OR (EXISTS ( SELECT 1
           FROM companies employer
          WHERE ((employer.user_id = (select auth.uid())) AND (employer.account_type = 'employer'::text) AND (employer.employer_linked_agency_id = phc.account_id) AND (employer.employer_linked_client_id = phc.cliente_id)))))))));
alter policy "Account members can create post hire checklists" on public.post_hire_checklists with check ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = post_hire_checklists.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Account members can delete post hire checklists" on public.post_hire_checklists using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = post_hire_checklists.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Account members can update post hire checklists" on public.post_hire_checklists using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = post_hire_checklists.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true))))) with check ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = post_hire_checklists.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Account members can view post hire checklists" on public.post_hire_checklists using (((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = post_hire_checklists.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM companies employer
  WHERE ((employer.user_id = (select auth.uid())) AND (employer.account_type = 'employer'::text) AND (employer.employer_linked_agency_id = post_hire_checklists.account_id) AND (employer.employer_linked_client_id = post_hire_checklists.cliente_id))))));
alter policy "Users can create their own reactions" on public.post_reactions with check (((select auth.uid()) = user_id));
alter policy "Users can delete their own reactions" on public.post_reactions using (((select auth.uid()) = user_id));
alter policy "Users can create their own confirmations" on public.post_read_confirmations with check (((select auth.uid()) = user_id));
alter policy "Users can view their own confirmations" on public.post_read_confirmations using (((select auth.uid()) = user_id));
alter policy "Admins can manage all pre-grants" on public.pre_client_grants using ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid())))) with check ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy "EP partners can manage their pre-grants" on public.pre_client_grants using (((grant_source = 'partner'::text) AND (partner_id = get_user_partner_id((select auth.uid()))))) with check (((grant_source = 'partner'::text) AND (partner_id = get_user_partner_id((select auth.uid())))));
alter policy "Account members can insert reports" on public.process_roi_reports with check ((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.account_id = process_roi_reports.account_id) AND (account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Account members can update reports" on public.process_roi_reports using ((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.account_id = process_roi_reports.account_id) AND (account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Account members can view reports" on public.process_roi_reports using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = process_roi_reports.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Linked employer accounts can view client reports" on public.process_roi_reports using ((EXISTS ( SELECT 1
   FROM (account_members am
     JOIN companies c ON ((c.id = am.account_id)))
  WHERE ((am.user_id = (select auth.uid())) AND (am.is_active = true) AND (c.account_type = 'employer'::text) AND (c.employer_linked_client_id = process_roi_reports.client_id)))));
alter policy "Super admins and head_cs can view all profiles" on public.profiles using ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy "Users can insert own profile" on public.profiles with check ((id = (select auth.uid())));
alter policy "Users can update own profile" on public.profiles using ((id = (select auth.uid())));
alter policy "Users can view own profile or admins view team" on public.profiles using (((id = (select auth.uid())) OR can_manage_account((select auth.uid()), account_id) OR is_account_admin_or_owner((select auth.uid()), account_id) OR is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy "Users can manage progression criteria of their account" on public.progression_criteria using ((from_level_id IN ( SELECT pl.id
   FROM (((position_levels pl
     JOIN positions p ON ((p.id = pl.position_id)))
     JOIN job_families jf ON ((jf.id = p.family_id)))
     JOIN compensation_models cm ON ((cm.id = jf.model_id)))
  WHERE (cm.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can view progression criteria of their account" on public.progression_criteria using ((from_level_id IN ( SELECT pl.id
   FROM (((position_levels pl
     JOIN positions p ON ((p.id = pl.position_id)))
     JOIN job_families jf ON ((jf.id = p.family_id)))
     JOIN compensation_models cm ON ((cm.id = jf.model_id)))
  WHERE (cm.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Project alerts are updatable by owners/admins" on public.project_alerts using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = project_alerts.account_id) AND (am.user_id = (select auth.uid())) AND (COALESCE(am.is_active, true) = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])))))) with check ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = project_alerts.account_id) AND (am.user_id = (select auth.uid())) AND (COALESCE(am.is_active, true) = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role]))))));
alter policy "Project alerts are viewable by account" on public.project_alerts using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Project alerts are viewable by account members" on public.project_alerts using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = project_alerts.account_id) AND (am.user_id = (select auth.uid())) AND (COALESCE(am.is_active, true) = true)))));
alter policy "Project alerts delete by editors" on public.project_alerts using (can_edit_client_project((select auth.uid()), account_id));
alter policy "Project alerts insert by editors" on public.project_alerts with check (can_edit_client_project((select auth.uid()), account_id));
alter policy "Project alerts update by editors" on public.project_alerts using (can_edit_client_project((select auth.uid()), account_id));
alter policy "EP Team can create checkpoints" on public.project_checkpoints with check (can_manage_checkpoints((select auth.uid()), account_id));
alter policy "EP Team can delete checkpoints" on public.project_checkpoints using (can_manage_checkpoints((select auth.uid()), account_id));
alter policy "EP Team can update checkpoints" on public.project_checkpoints using (can_manage_checkpoints((select auth.uid()), account_id));
alter policy "Users can view checkpoints" on public.project_checkpoints using (can_view_checkpoints((select auth.uid()), account_id));
alter policy "Project comments are readable by account" on public.project_comments using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Project comments can be created by account" on public.project_comments with check (((user_id = (select auth.uid())) AND (is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))));
alter policy "Project comments can be deleted by author" on public.project_comments using (((user_id = (select auth.uid())) AND (is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))));
alter policy "Project comments can be updated by author" on public.project_comments using (((user_id = (select auth.uid())) AND (is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)))) with check (((user_id = (select auth.uid())) AND (is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))));
alter policy "Account members can view shared documents" on public.project_documents using (((is_shared_with_client = true) AND is_account_member((select auth.uid()), account_id)));
alter policy "EP consultants can manage assigned client documents" on public.project_documents using (is_consultant_for_account((select auth.uid()), account_id));
alter policy "Super admins can manage all project documents" on public.project_documents using ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy "Account members can view their health score" on public.project_health_scores using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.user_id = (select auth.uid())) AND (am.account_id = project_health_scores.account_id) AND (am.is_active = true)))));
alter policy "EP Team can manage health scores" on public.project_health_scores using ((EXISTS ( SELECT 1
   FROM ep_consultants ec
  WHERE ((ec.user_id = (select auth.uid())) AND (ec.active = true)))));
alter policy "EP Team can view all health scores" on public.project_health_scores using ((EXISTS ( SELECT 1
   FROM ep_consultants ec
  WHERE ((ec.user_id = (select auth.uid())) AND (ec.active = true)))));
alter policy "Account members can view their milestones" on public.project_milestones using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.user_id = (select auth.uid())) AND (am.account_id = project_milestones.account_id) AND (am.is_active = true)))));
alter policy "EP Team can manage milestones" on public.project_milestones using ((EXISTS ( SELECT 1
   FROM ep_consultants ec
  WHERE ((ec.user_id = (select auth.uid())) AND (ec.active = true)))));
alter policy "EP Team can view all milestones" on public.project_milestones using ((EXISTS ( SELECT 1
   FROM ep_consultants ec
  WHERE ((ec.user_id = (select auth.uid())) AND (ec.active = true)))));
alter policy "Account members can view playbook applications" on public.project_playbook_applications using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = am.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "EP team can apply playbooks to assigned accounts" on public.project_playbook_applications with check ((EXISTS ( SELECT 1
   FROM (consultant_assignments ca
     JOIN ep_consultants ec ON ((ec.id = ca.consultant_id)))
  WHERE ((ca.account_id = ca.account_id) AND (ec.user_id = (select auth.uid())) AND (ec.active = true) AND (ca.active = true)))));
alter policy "EP team can update playbook applications" on public.project_playbook_applications using ((EXISTS ( SELECT 1
   FROM (consultant_assignments ca
     JOIN ep_consultants ec ON ((ec.id = ca.consultant_id)))
  WHERE ((ca.account_id = ca.account_id) AND (ec.user_id = (select auth.uid())) AND (ec.active = true) AND (ca.active = true)))));
alter policy "EP team can view playbook applications" on public.project_playbook_applications using ((EXISTS ( SELECT 1
   FROM (consultant_assignments ca
     JOIN ep_consultants ec ON ((ec.id = ca.consultant_id)))
  WHERE ((ca.account_id = ca.account_id) AND (ec.user_id = (select auth.uid())) AND (ec.active = true) AND (ca.active = true)))));
alter policy "EP admins can manage playbooks" on public.project_playbooks using ((EXISTS ( SELECT 1
   FROM ep_consultants ec
  WHERE ((ec.user_id = (select auth.uid())) AND (ec.active = true)))));
alter policy "EP team can view active playbooks" on public.project_playbooks using (((is_active = true) AND (EXISTS ( SELECT 1
   FROM ep_consultants ec
  WHERE ((ec.user_id = (select auth.uid())) AND (ec.active = true))))));
alter policy "Super admin can view all playbooks" on public.project_playbooks using ((EXISTS ( SELECT 1
   FROM ep_consultants ec
  WHERE ((ec.user_id = (select auth.uid())) AND (ec.active = true)))));
alter policy "EP consultants can insert recommendations for assigned projects" on public.project_recommendations with check (((EXISTS ( SELECT 1
   FROM (consultant_assignments ca
     JOIN ep_consultants ec ON ((ec.id = ca.consultant_id)))
  WHERE ((ca.account_id = project_recommendations.account_id) AND (ec.user_id = (select auth.uid())) AND (ca.active = true)))) OR is_head_cs((select auth.uid())) OR is_super_admin((select auth.uid()))));
alter policy "EP consultants can update recommendations for assigned projects" on public.project_recommendations using (((EXISTS ( SELECT 1
   FROM (consultant_assignments ca
     JOIN ep_consultants ec ON ((ec.id = ca.consultant_id)))
  WHERE ((ca.account_id = project_recommendations.account_id) AND (ec.user_id = (select auth.uid())) AND (ca.active = true)))) OR is_head_cs((select auth.uid())) OR is_super_admin((select auth.uid()))));
alter policy "EP consultants can view recommendations for assigned projects" on public.project_recommendations using (((EXISTS ( SELECT 1
   FROM (consultant_assignments ca
     JOIN ep_consultants ec ON ((ec.id = ca.consultant_id)))
  WHERE ((ca.account_id = project_recommendations.account_id) AND (ec.user_id = (select auth.uid())) AND (ca.active = true)))) OR is_head_cs((select auth.uid())) OR is_super_admin((select auth.uid()))));
alter policy "EP team can read project resource requirements" on public.project_resource_requirements using ((has_role((select auth.uid()), 'super_admin'::app_role) OR has_role((select auth.uid()), 'head_cs'::app_role) OR has_role((select auth.uid()), 'ep_consultant'::app_role) OR has_role((select auth.uid()), 'ep_partner'::app_role)));
alter policy "Head CS can delete project resource requirements" on public.project_resource_requirements using ((has_role((select auth.uid()), 'super_admin'::app_role) OR has_role((select auth.uid()), 'head_cs'::app_role)));
alter policy "Head CS can insert project resource requirements" on public.project_resource_requirements with check ((has_role((select auth.uid()), 'super_admin'::app_role) OR has_role((select auth.uid()), 'head_cs'::app_role)));
alter policy "Head CS can update project resource requirements" on public.project_resource_requirements using ((has_role((select auth.uid()), 'super_admin'::app_role) OR has_role((select auth.uid()), 'head_cs'::app_role))) with check ((has_role((select auth.uid()), 'super_admin'::app_role) OR has_role((select auth.uid()), 'head_cs'::app_role)));
alter policy "Members can manage projects history" on public.projects_version_history using (is_account_member((select auth.uid()), account_id));
alter policy promo_code_redemptions_select on public.promo_code_redemptions using ((is_super_admin((select auth.uid())) OR (user_id = (select auth.uid())) OR (partner_id IN ( SELECT ep_partners.id
   FROM ep_partners
  WHERE (ep_partners.user_id = (select auth.uid()))))));
alter policy "Admins can manage actions" on public.pulse_admin_actions using (is_pulse_admin((select auth.uid()), account_id));
alter policy "Members can view actions" on public.pulse_admin_actions using (is_account_member((select auth.uid()), account_id));
alter policy "Admins can manage alerts" on public.pulse_alerts using (is_pulse_admin((select auth.uid()), account_id));
alter policy "Leaders can view alerts" on public.pulse_alerts using (is_pulse_leader((select auth.uid()), account_id));
alter policy "Admins can manage badges" on public.pulse_badges using (((account_id IS NOT NULL) AND is_pulse_admin((select auth.uid()), account_id)));
alter policy "Anyone can view badges" on public.pulse_badges using (((account_id IS NULL) OR is_account_member((select auth.uid()), account_id)));
alter policy "Admins can manage company values" on public.pulse_company_values using (is_pulse_admin((select auth.uid()), account_id));
alter policy "Members can view company values" on public.pulse_company_values using (is_account_member((select auth.uid()), account_id));
alter policy "Users can read own account culture metrics" on public.pulse_culture_metrics_daily using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Users can manage culture questions for their account" on public.pulse_culture_questions using (is_account_member((select auth.uid()), account_id));
alter policy "Users can view culture questions for their account" on public.pulse_culture_questions using (is_account_member((select auth.uid()), account_id));
alter policy "Admins can manage assignment items" on public.pulse_daily_assignment_items using ((EXISTS ( SELECT 1
   FROM pulse_daily_assignments pda
  WHERE ((pda.id = pulse_daily_assignment_items.assignment_id) AND is_pulse_admin((select auth.uid()), pda.account_id)))));
alter policy "Members can view assignment items" on public.pulse_daily_assignment_items using ((EXISTS ( SELECT 1
   FROM pulse_daily_assignments pda
  WHERE ((pda.id = pulse_daily_assignment_items.assignment_id) AND is_account_member((select auth.uid()), pda.account_id)))));
alter policy "Admins can manage assignments" on public.pulse_daily_assignments using (is_pulse_admin((select auth.uid()), account_id));
alter policy "Members can view assignments" on public.pulse_daily_assignments using (is_account_member((select auth.uid()), account_id));
alter policy "Admins can manage drivers" on public.pulse_drivers using (((account_id IS NOT NULL) AND is_pulse_admin((select auth.uid()), account_id)));
alter policy "Anyone can view drivers" on public.pulse_drivers using (((account_id IS NULL) OR is_account_member((select auth.uid()), account_id)));
alter policy "Admins can manage emoji sets" on public.pulse_emoji_sets using (((account_id IS NOT NULL) AND is_pulse_admin((select auth.uid()), account_id)));
alter policy "Anyone can view emoji sets" on public.pulse_emoji_sets using (((account_id IS NULL) OR is_account_member((select auth.uid()), account_id)));
alter policy "Admins can manage points" on public.pulse_gamification_points_log using (is_pulse_admin((select auth.uid()), account_id));
alter policy "Users can view own points" on public.pulse_gamification_points_log using ((user_id = (select auth.uid())));
alter policy "Admins can manage gamification rules" on public.pulse_gamification_rules using (((account_id IS NOT NULL) AND is_pulse_admin((select auth.uid()), account_id)));
alter policy "Anyone can view gamification rules" on public.pulse_gamification_rules using (((account_id IS NULL) OR is_account_member((select auth.uid()), account_id)));
alter policy "Admins can manage levels" on public.pulse_levels using (((account_id IS NOT NULL) AND is_pulse_admin((select auth.uid()), account_id)));
alter policy "Anyone can view levels" on public.pulse_levels using (((account_id IS NULL) OR is_account_member((select auth.uid()), account_id)));
alter policy "Admins can manage metrics" on public.pulse_metrics_daily using (is_pulse_admin((select auth.uid()), account_id));
alter policy "Leaders can view metrics" on public.pulse_metrics_daily using (is_pulse_leader((select auth.uid()), account_id));
alter policy "Account admins can manage notification channels" on public.pulse_notification_channels using ((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.account_id = pulse_notification_channels.account_id) AND (account_members.user_id = (select auth.uid())) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role]))))));
alter policy "Account members can view notification channels" on public.pulse_notification_channels using (is_account_member((select auth.uid()), account_id));
alter policy "Owners and RH admins can view pulse notification deliveries" on public.pulse_notification_deliveries using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = pulse_notification_deliveries.account_id) AND (am.user_id = (select auth.uid())) AND (COALESCE(am.is_active, true) = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin_rh'::account_role]))))));
alter policy "Admins can manage pillar driver map" on public.pulse_pillar_driver_map using (((account_id IS NOT NULL) AND is_pulse_admin((select auth.uid()), account_id)));
alter policy "Anyone can view pillar driver map" on public.pulse_pillar_driver_map using (((account_id IS NULL) OR is_account_member((select auth.uid()), account_id)));
alter policy "Admins can manage pillars" on public.pulse_pillars using (((account_id IS NOT NULL) AND is_pulse_admin((select auth.uid()), account_id)));
alter policy "Anyone can view pillars" on public.pulse_pillars using (((account_id IS NULL) OR is_account_member((select auth.uid()), account_id)));
alter policy "Admins can manage question history" on public.pulse_question_history using (is_pulse_admin((select auth.uid()), account_id));
alter policy "Admins can view question history" on public.pulse_question_history using (is_pulse_admin((select auth.uid()), account_id));
alter policy "Admins can manage questions" on public.pulse_questions using (is_pulse_admin((select auth.uid()), account_id));
alter policy "Members can view active questions" on public.pulse_questions using (is_account_member((select auth.uid()), account_id));
alter policy "Pulse admins can manage questions" on public.pulse_questions using (((account_id IS NULL) OR is_pulse_admin((select auth.uid()), account_id))) with check (is_pulse_admin((select auth.uid()), account_id));
alter policy "Admins can view all responses" on public.pulse_responses using (is_pulse_admin((select auth.uid()), account_id));
alter policy "Leaders can view team aggregated responses" on public.pulse_responses using ((is_pulse_leader((select auth.uid()), account_id) AND ((is_anonymous = false) OR (respondent_team_id = ANY (get_leader_team_ids((select auth.uid()), account_id))))));
alter policy "Users can insert own responses" on public.pulse_responses with check ((is_account_member((select auth.uid()), account_id) AND ((respondent_user_id = (select auth.uid())) OR (respondent_user_id IS NULL))));
alter policy "Users can view own identified responses" on public.pulse_responses using (((respondent_user_id = (select auth.uid())) AND (is_anonymous = false)));
alter policy "Admins can manage schedule rules" on public.pulse_schedule_rules using (is_pulse_admin((select auth.uid()), account_id));
alter policy "Admins can view schedule rules" on public.pulse_schedule_rules using (is_pulse_leader((select auth.uid()), account_id));
alter policy "Pulse admins can delete pulse surveys" on public.pulse_surveys using (is_pulse_admin((select auth.uid()), account_id));
alter policy "Pulse admins can insert pulse surveys" on public.pulse_surveys with check (is_pulse_admin((select auth.uid()), account_id));
alter policy "Pulse admins can update pulse surveys" on public.pulse_surveys using (is_pulse_admin((select auth.uid()), account_id));
alter policy "Users can view pulse surveys for their account" on public.pulse_surveys using ((is_account_member((select auth.uid()), account_id) OR is_pulse_admin((select auth.uid()), account_id)));
alter policy "Admins can manage teams" on public.pulse_teams using (is_pulse_admin((select auth.uid()), account_id));
alter policy "Members can view their account teams" on public.pulse_teams using (is_account_member((select auth.uid()), account_id));
alter policy "Admins and leaders can view account badges" on public.pulse_user_badges using (((user_id = (select auth.uid())) OR is_pulse_admin_or_leader((select auth.uid()), account_id)));
alter policy "Admins can manage user badges" on public.pulse_user_badges using (is_pulse_admin((select auth.uid()), account_id));
alter policy "Users can view own badges" on public.pulse_user_badges using ((user_id = (select auth.uid())));
alter policy "Admins and leaders can view account profiles" on public.pulse_user_profiles using (((user_id = (select auth.uid())) OR is_pulse_admin_or_leader((select auth.uid()), account_id)));
alter policy "Admins can manage profiles" on public.pulse_user_profiles using (is_pulse_admin((select auth.uid()), account_id));
alter policy "Users can view own profile" on public.pulse_user_profiles using ((user_id = (select auth.uid())));
alter policy "Leaders can view team progress" on public.pulse_user_progress using (is_pulse_leader((select auth.uid()), account_id));
alter policy "Users can update own progress" on public.pulse_user_progress using ((user_id = (select auth.uid())));
alter policy "Users can view own progress" on public.pulse_user_progress using ((user_id = (select auth.uid())));
alter policy "Admins can view all streaks" on public.pulse_user_streaks using (is_pulse_admin((select auth.uid()), account_id));
alter policy "Users can update own streak" on public.pulse_user_streaks using ((user_id = (select auth.uid())));
alter policy "Users can view own streak" on public.pulse_user_streaks using ((user_id = (select auth.uid())));
alter policy "Pulse admins can manage weekly driver counts" on public.pulse_weekly_driver_counts using (is_pulse_admin((select auth.uid()), account_id)) with check (is_pulse_admin((select auth.uid()), account_id));
alter policy "Usuários podem inserir respostas em suas sessões QA" on public.qa_responses with check ((session_id IN ( SELECT qa_sessions.id
   FROM qa_sessions
  WHERE (qa_sessions.user_id = (select auth.uid())))));
alter policy "Usuários podem ver respostas de suas sessões QA" on public.qa_responses using ((session_id IN ( SELECT qa_sessions.id
   FROM qa_sessions
  WHERE ((qa_sessions.user_id = (select auth.uid())) OR (qa_sessions.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid()))))))));
alter policy "Usuários podem inserir resultados em suas sessões QA" on public.qa_results with check ((session_id IN ( SELECT qa_sessions.id
   FROM qa_sessions
  WHERE (qa_sessions.user_id = (select auth.uid())))));
alter policy "Usuários podem ver resultados de suas sessões QA" on public.qa_results using ((session_id IN ( SELECT qa_sessions.id
   FROM qa_sessions
  WHERE ((qa_sessions.user_id = (select auth.uid())) OR (qa_sessions.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid()))))))));
alter policy "Usuários podem atualizar suas próprias sessões QA" on public.qa_sessions using ((user_id = (select auth.uid())));
alter policy "Usuários podem criar suas próprias sessões QA" on public.qa_sessions with check ((user_id = (select auth.uid())));
alter policy "Usuários podem ver suas próprias sessões QA" on public.qa_sessions using (((user_id = (select auth.uid())) OR (account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid()))))));
alter policy "Users can view own rate limits" on public.rate_limit_tracking using ((user_id = (select auth.uid())));
alter policy "Users can insert their own feedback" on public.recommendation_feedback with check ((created_by = (select auth.uid())));
alter policy "Users can view feedback they created" on public.recommendation_feedback using ((created_by = (select auth.uid())));
alter policy "EP consultants can insert generation logs for assigned projects" on public.recommendation_generation_log with check (((EXISTS ( SELECT 1
   FROM (consultant_assignments ca
     JOIN ep_consultants ec ON ((ec.id = ca.consultant_id)))
  WHERE ((ca.account_id = recommendation_generation_log.account_id) AND (ec.user_id = (select auth.uid())) AND (ca.active = true)))) OR is_head_cs((select auth.uid())) OR is_super_admin((select auth.uid()))));
alter policy "EP consultants can view generation logs for assigned projects" on public.recommendation_generation_log using (((EXISTS ( SELECT 1
   FROM (consultant_assignments ca
     JOIN ep_consultants ec ON ((ec.id = ca.consultant_id)))
  WHERE ((ca.account_id = recommendation_generation_log.account_id) AND (ec.user_id = (select auth.uid())) AND (ca.active = true)))) OR is_head_cs((select auth.uid())) OR is_super_admin((select auth.uid()))));
alter policy "Members can insert copilot messages" on public.recruiter_copilot_messages with check ((EXISTS ( SELECT 1
   FROM recruiter_copilot_threads t
  WHERE ((t.id = recruiter_copilot_messages.thread_id) AND (is_account_member((select auth.uid()), t.account_id) OR can_edit_client_project((select auth.uid()), t.account_id) OR is_super_admin((select auth.uid())))))));
alter policy "Members can view copilot messages" on public.recruiter_copilot_messages using ((EXISTS ( SELECT 1
   FROM recruiter_copilot_threads t
  WHERE ((t.id = recruiter_copilot_messages.thread_id) AND (is_account_member((select auth.uid()), t.account_id) OR can_edit_client_project((select auth.uid()), t.account_id) OR is_super_admin((select auth.uid())))))));
alter policy "Members can create copilot threads" on public.recruiter_copilot_threads with check (((created_by = (select auth.uid())) AND (is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id) OR is_super_admin((select auth.uid())))));
alter policy "Members can delete copilot threads" on public.recruiter_copilot_threads using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id) OR is_super_admin((select auth.uid()))));
alter policy "Members can update copilot threads" on public.recruiter_copilot_threads using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id) OR is_super_admin((select auth.uid()))));
alter policy "Members can view copilot threads" on public.recruiter_copilot_threads using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id) OR is_super_admin((select auth.uid()))));
alter policy "Users can delete activities in their account" on public.recruitment_activities using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can insert activities in their account" on public.recruitment_activities with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can update activities in their account" on public.recruitment_activities using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can view activities in their account" on public.recruitment_activities using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can create criteria for their agents" on public.recruitment_agent_criteria with check ((EXISTS ( SELECT 1
   FROM recruitment_agents ra
  WHERE ((ra.id = recruitment_agent_criteria.agent_id) AND (is_account_member((select auth.uid()), ra.account_id) OR can_edit_client_project((select auth.uid()), ra.account_id))))));
alter policy "Users can delete criteria of their agents" on public.recruitment_agent_criteria using ((EXISTS ( SELECT 1
   FROM recruitment_agents ra
  WHERE ((ra.id = recruitment_agent_criteria.agent_id) AND (is_account_member((select auth.uid()), ra.account_id) OR can_edit_client_project((select auth.uid()), ra.account_id))))));
alter policy "Users can update criteria of their agents" on public.recruitment_agent_criteria using ((EXISTS ( SELECT 1
   FROM recruitment_agents ra
  WHERE ((ra.id = recruitment_agent_criteria.agent_id) AND (is_account_member((select auth.uid()), ra.account_id) OR can_edit_client_project((select auth.uid()), ra.account_id))))));
alter policy "Users can view criteria of their agents" on public.recruitment_agent_criteria using ((EXISTS ( SELECT 1
   FROM recruitment_agents ra
  WHERE ((ra.id = recruitment_agent_criteria.agent_id) AND (is_account_member((select auth.uid()), ra.account_id) OR can_edit_client_project((select auth.uid()), ra.account_id))))));
alter policy "Users can delete prompts for their account's agents" on public.recruitment_agent_prompts using ((EXISTS ( SELECT 1
   FROM recruitment_agents ra
  WHERE ((ra.id = recruitment_agent_prompts.agent_id) AND (is_account_member((select auth.uid()), ra.account_id) OR can_edit_client_project((select auth.uid()), ra.account_id))))));
alter policy "Users can insert prompts for their account's agents" on public.recruitment_agent_prompts with check ((EXISTS ( SELECT 1
   FROM recruitment_agents ra
  WHERE ((ra.id = recruitment_agent_prompts.agent_id) AND (is_account_member((select auth.uid()), ra.account_id) OR can_edit_client_project((select auth.uid()), ra.account_id))))));
alter policy "Users can update prompts for their account's agents" on public.recruitment_agent_prompts using ((EXISTS ( SELECT 1
   FROM recruitment_agents ra
  WHERE ((ra.id = recruitment_agent_prompts.agent_id) AND (is_account_member((select auth.uid()), ra.account_id) OR can_edit_client_project((select auth.uid()), ra.account_id))))));
alter policy "Users can view prompts for their account's agents" on public.recruitment_agent_prompts using ((EXISTS ( SELECT 1
   FROM recruitment_agents ra
  WHERE ((ra.id = recruitment_agent_prompts.agent_id) AND (is_account_member((select auth.uid()), ra.account_id) OR can_edit_client_project((select auth.uid()), ra.account_id))))));
alter policy "Users can create questions for their agents" on public.recruitment_agent_questions with check ((EXISTS ( SELECT 1
   FROM recruitment_agents ra
  WHERE ((ra.id = recruitment_agent_questions.agent_id) AND (is_account_member((select auth.uid()), ra.account_id) OR can_edit_client_project((select auth.uid()), ra.account_id))))));
alter policy "Users can delete questions of their agents" on public.recruitment_agent_questions using ((EXISTS ( SELECT 1
   FROM recruitment_agents ra
  WHERE ((ra.id = recruitment_agent_questions.agent_id) AND (is_account_member((select auth.uid()), ra.account_id) OR can_edit_client_project((select auth.uid()), ra.account_id))))));
alter policy "Users can update questions of their agents" on public.recruitment_agent_questions using ((EXISTS ( SELECT 1
   FROM recruitment_agents ra
  WHERE ((ra.id = recruitment_agent_questions.agent_id) AND (is_account_member((select auth.uid()), ra.account_id) OR can_edit_client_project((select auth.uid()), ra.account_id))))));
alter policy "Users can view questions of their agents" on public.recruitment_agent_questions using ((EXISTS ( SELECT 1
   FROM recruitment_agents ra
  WHERE ((ra.id = recruitment_agent_questions.agent_id) AND (is_account_member((select auth.uid()), ra.account_id) OR can_edit_client_project((select auth.uid()), ra.account_id))))));
alter policy "Users can create agents in their account" on public.recruitment_agents with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can delete agents in their account" on public.recruitment_agents using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can update agents in their account" on public.recruitment_agents using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can view agents in their account" on public.recruitment_agents using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can manage applications" on public.recruitment_applications using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy history_select on public.recruitment_applications_history using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy org_admins_read_recharge_attempts on public.recruitment_auto_recharge_attempts using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = recruitment_auto_recharge_attempts.org_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role]))))));
alter policy rcce_delete on public.recruitment_candidate_contact_exceptions using (can_edit_client_project((select auth.uid()), account_id));
alter policy rcce_insert on public.recruitment_candidate_contact_exceptions with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy rcce_select on public.recruitment_candidate_contact_exceptions using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy rcce_update on public.recruitment_candidate_contact_exceptions using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy rccp_delete on public.recruitment_candidate_contact_prefs using (can_edit_client_project((select auth.uid()), account_id));
alter policy rccp_insert on public.recruitment_candidate_contact_prefs with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy rccp_select on public.recruitment_candidate_contact_prefs using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy rccp_update on public.recruitment_candidate_contact_prefs using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can delete candidates" on public.recruitment_candidates using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can insert candidates" on public.recruitment_candidates with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update candidates" on public.recruitment_candidates using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view candidates" on public.recruitment_candidates using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Admins can resolve recruitment communication alerts" on public.recruitment_communication_alerts using ((is_account_admin_or_owner((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_admin_or_owner((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Admins can view recruitment communication alerts" on public.recruitment_communication_alerts using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can insert recruitment communications logs" on public.recruitment_communications_log with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view recruitment communications logs" on public.recruitment_communications_log using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Super admins can delete credit costs" on public.recruitment_credit_costs using ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy "Super admins can insert credit costs" on public.recruitment_credit_costs with check ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy "Super admins can delete credit packages" on public.recruitment_credit_packages using ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy "Super admins can insert credit packages" on public.recruitment_credit_packages with check ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy "Super admins can update credit packages" on public.recruitment_credit_packages using ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid())))) with check ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy "Super admins can view all packages" on public.recruitment_credit_packages using ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy "Members can create cross-match suggestions" on public.recruitment_cross_match_suggestions with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update cross-match suggestions" on public.recruitment_cross_match_suggestions using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view cross-match suggestions" on public.recruitment_cross_match_suggestions using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can view decision logs" on public.recruitment_decision_log using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = recruitment_decision_log.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Users can delete disc profiles for jobs they manage" on public.recruitment_disc_profiles using ((EXISTS ( SELECT 1
   FROM recruitment_jobs rj
  WHERE ((rj.id = recruitment_disc_profiles.job_id) AND (is_account_member((select auth.uid()), rj.account_id) OR can_edit_client_project((select auth.uid()), rj.account_id))))));
alter policy "Users can insert disc profiles for jobs they manage" on public.recruitment_disc_profiles with check ((EXISTS ( SELECT 1
   FROM recruitment_jobs rj
  WHERE ((rj.id = recruitment_disc_profiles.job_id) AND (is_account_member((select auth.uid()), rj.account_id) OR can_edit_client_project((select auth.uid()), rj.account_id))))));
alter policy "Users can update disc profiles for jobs they manage" on public.recruitment_disc_profiles using ((EXISTS ( SELECT 1
   FROM recruitment_jobs rj
  WHERE ((rj.id = recruitment_disc_profiles.job_id) AND (is_account_member((select auth.uid()), rj.account_id) OR can_edit_client_project((select auth.uid()), rj.account_id))))));
alter policy "Users can view disc profiles for jobs they have access to" on public.recruitment_disc_profiles using ((EXISTS ( SELECT 1
   FROM recruitment_jobs rj
  WHERE ((rj.id = recruitment_disc_profiles.job_id) AND (is_account_member((select auth.uid()), rj.account_id) OR can_edit_client_project((select auth.uid()), rj.account_id))))));
alter policy "Users can insert email logs for own account" on public.recruitment_email_log with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can view own account email logs" on public.recruitment_email_log using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can delete templates in their account" on public.recruitment_email_templates using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can insert templates in their account" on public.recruitment_email_templates with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can update templates in their account" on public.recruitment_email_templates using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can view templates in their account" on public.recruitment_email_templates using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can insert enriched profiles for their account candidates" on public.recruitment_enriched_profiles with check ((EXISTS ( SELECT 1
   FROM recruitment_candidates rc
  WHERE ((rc.id = recruitment_enriched_profiles.candidate_id) AND (is_account_member((select auth.uid()), rc.account_id) OR can_edit_client_project((select auth.uid()), rc.account_id))))));
alter policy "Users can update enriched profiles for their account candidates" on public.recruitment_enriched_profiles using ((EXISTS ( SELECT 1
   FROM recruitment_candidates rc
  WHERE ((rc.id = recruitment_enriched_profiles.candidate_id) AND (is_account_member((select auth.uid()), rc.account_id) OR can_edit_client_project((select auth.uid()), rc.account_id))))));
alter policy "Users can view enriched profiles for their account candidates" on public.recruitment_enriched_profiles using ((EXISTS ( SELECT 1
   FROM recruitment_candidates rc
  WHERE ((rc.id = recruitment_enriched_profiles.candidate_id) AND (is_account_member((select auth.uid()), rc.account_id) OR can_edit_client_project((select auth.uid()), rc.account_id))))));
alter policy "Users can create evaluation scores for their account" on public.recruitment_evaluation_scores with check ((EXISTS ( SELECT 1
   FROM ((recruitment_evaluations re
     JOIN recruitment_applications ra ON ((re.application_id = ra.id)))
     JOIN recruitment_jobs rj ON ((ra.job_id = rj.id)))
  WHERE ((re.id = recruitment_evaluation_scores.evaluation_id) AND (is_account_member((select auth.uid()), rj.account_id) OR can_edit_client_project((select auth.uid()), rj.account_id))))));
alter policy "Users can delete evaluation scores from their account" on public.recruitment_evaluation_scores using ((EXISTS ( SELECT 1
   FROM ((recruitment_evaluations re
     JOIN recruitment_applications ra ON ((re.application_id = ra.id)))
     JOIN recruitment_jobs rj ON ((ra.job_id = rj.id)))
  WHERE ((re.id = recruitment_evaluation_scores.evaluation_id) AND (is_account_member((select auth.uid()), rj.account_id) OR can_edit_client_project((select auth.uid()), rj.account_id))))));
alter policy "Users can update evaluation scores from their account" on public.recruitment_evaluation_scores using ((EXISTS ( SELECT 1
   FROM ((recruitment_evaluations re
     JOIN recruitment_applications ra ON ((re.application_id = ra.id)))
     JOIN recruitment_jobs rj ON ((ra.job_id = rj.id)))
  WHERE ((re.id = recruitment_evaluation_scores.evaluation_id) AND (is_account_member((select auth.uid()), rj.account_id) OR can_edit_client_project((select auth.uid()), rj.account_id))))));
alter policy "Users can view evaluation scores from their account" on public.recruitment_evaluation_scores using ((EXISTS ( SELECT 1
   FROM ((recruitment_evaluations re
     JOIN recruitment_applications ra ON ((re.application_id = ra.id)))
     JOIN recruitment_jobs rj ON ((ra.job_id = rj.id)))
  WHERE ((re.id = recruitment_evaluation_scores.evaluation_id) AND (is_account_member((select auth.uid()), rj.account_id) OR can_edit_client_project((select auth.uid()), rj.account_id))))));
alter policy "Users can create evaluations for their account" on public.recruitment_evaluations with check ((EXISTS ( SELECT 1
   FROM (recruitment_applications ra
     JOIN recruitment_jobs rj ON ((ra.job_id = rj.id)))
  WHERE ((ra.id = recruitment_evaluations.application_id) AND (is_account_member((select auth.uid()), rj.account_id) OR can_edit_client_project((select auth.uid()), rj.account_id))))));
alter policy "Users can delete evaluations from their account" on public.recruitment_evaluations using ((EXISTS ( SELECT 1
   FROM (recruitment_applications ra
     JOIN recruitment_jobs rj ON ((ra.job_id = rj.id)))
  WHERE ((ra.id = recruitment_evaluations.application_id) AND (is_account_member((select auth.uid()), rj.account_id) OR can_edit_client_project((select auth.uid()), rj.account_id))))));
alter policy "Users can update evaluations from their account" on public.recruitment_evaluations using ((EXISTS ( SELECT 1
   FROM (recruitment_applications ra
     JOIN recruitment_jobs rj ON ((ra.job_id = rj.id)))
  WHERE ((ra.id = recruitment_evaluations.application_id) AND (is_account_member((select auth.uid()), rj.account_id) OR can_edit_client_project((select auth.uid()), rj.account_id))))));
alter policy "Users can view evaluations from their account" on public.recruitment_evaluations using ((EXISTS ( SELECT 1
   FROM (recruitment_applications ra
     JOIN recruitment_jobs rj ON ((ra.job_id = rj.id)))
  WHERE ((ra.id = recruitment_evaluations.application_id) AND (is_account_member((select auth.uid()), rj.account_id) OR can_edit_client_project((select auth.uid()), rj.account_id))))));
alter policy "Users can delete goals for their account" on public.recruitment_goals using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can insert goals for their account" on public.recruitment_goals with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can update goals for their account" on public.recruitment_goals using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can view goals for their account" on public.recruitment_goals using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account admins can delete recruitment headcount plan" on public.recruitment_headcount_plan using ((is_account_admin_or_owner((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account admins can insert recruitment headcount plan" on public.recruitment_headcount_plan with check ((is_account_admin_or_owner((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account admins can update recruitment headcount plan" on public.recruitment_headcount_plan using ((is_account_admin_or_owner((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_admin_or_owner((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can read recruitment headcount plan" on public.recruitment_headcount_plan using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can create approaches" on public.recruitment_hunting_approaches with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can update approaches" on public.recruitment_hunting_approaches using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can view approaches" on public.recruitment_hunting_approaches using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can view email validation logs" on public.recruitment_hunting_email_validation_log using (((account_id IS NULL) OR is_account_member((select auth.uid()), account_id)));
alter policy delete_icp_suggestions_account on public.recruitment_hunting_icp_suggestions using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy insert_icp_suggestions_account on public.recruitment_hunting_icp_suggestions with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy update_icp_suggestions_account on public.recruitment_hunting_icp_suggestions using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy view_icp_suggestions_account on public.recruitment_hunting_icp_suggestions using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members view intent signals" on public.recruitment_hunting_intent_signals using (is_account_member((select auth.uid()), account_id));
alter policy "Service can insert intent signals" on public.recruitment_hunting_intent_signals with check (is_account_member((select auth.uid()), account_id));
alter policy delete_rejection_patterns_account on public.recruitment_hunting_rejection_patterns using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy insert_rejection_patterns_account on public.recruitment_hunting_rejection_patterns with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy view_rejection_patterns_account on public.recruitment_hunting_rejection_patterns using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can create hunting results for their account" on public.recruitment_hunting_results with check ((EXISTS ( SELECT 1
   FROM recruitment_hunting_searches rhs
  WHERE ((rhs.id = recruitment_hunting_results.search_id) AND (is_account_member((select auth.uid()), rhs.account_id) OR can_edit_client_project((select auth.uid()), rhs.account_id))))));
alter policy "Users can delete hunting results for their account" on public.recruitment_hunting_results using ((EXISTS ( SELECT 1
   FROM recruitment_hunting_searches rhs
  WHERE ((rhs.id = recruitment_hunting_results.search_id) AND (is_account_member((select auth.uid()), rhs.account_id) OR can_edit_client_project((select auth.uid()), rhs.account_id))))));
alter policy "Users can update hunting results for their account" on public.recruitment_hunting_results using ((EXISTS ( SELECT 1
   FROM recruitment_hunting_searches rhs
  WHERE ((rhs.id = recruitment_hunting_results.search_id) AND (is_account_member((select auth.uid()), rhs.account_id) OR can_edit_client_project((select auth.uid()), rhs.account_id))))));
alter policy "Users can view hunting results for their account" on public.recruitment_hunting_results using ((EXISTS ( SELECT 1
   FROM recruitment_hunting_searches rhs
  WHERE ((rhs.id = recruitment_hunting_results.search_id) AND (is_account_member((select auth.uid()), rhs.account_id) OR can_edit_client_project((select auth.uid()), rhs.account_id))))));
alter policy "Account members insert search attempts" on public.recruitment_hunting_search_attempts with check (is_account_member((select auth.uid()), account_id));
alter policy "Account members view search attempts" on public.recruitment_hunting_search_attempts using (is_account_member((select auth.uid()), account_id));
alter policy "Users can create hunting searches for their account" on public.recruitment_hunting_searches with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can delete hunting searches for their account" on public.recruitment_hunting_searches using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can update hunting searches for their account" on public.recruitment_hunting_searches using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can view hunting searches for their account" on public.recruitment_hunting_searches using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can manage interviews" on public.recruitment_interviews using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Token-validated interview select" on public.recruitment_interviews using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id) OR ((access_token IS NOT NULL) AND (access_token = ((current_setting('request.headers'::text, true))::json ->> 'x-interview-token'::text)))));
alter policy "Token-validated interview update" on public.recruitment_interviews using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id) OR ((access_token IS NOT NULL) AND (access_token = ((current_setting('request.headers'::text, true))::json ->> 'x-interview-token'::text))))) with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id) OR ((access_token IS NOT NULL) AND (access_token = ((current_setting('request.headers'::text, true))::json ->> 'x-interview-token'::text)))));
alter policy "Authors can delete their job notes" on public.recruitment_job_notes using ((author_id = (select auth.uid())));
alter policy "Authors can update their job notes" on public.recruitment_job_notes using ((author_id = (select auth.uid())));
alter policy "Members can insert job notes" on public.recruitment_job_notes with check ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = recruitment_job_notes.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Members can view job notes" on public.recruitment_job_notes using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = recruitment_job_notes.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Account members can manage workflow config" on public.recruitment_job_workflow_config using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy rjws_delete_account on public.recruitment_job_workflow_steps using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy rjws_insert_account on public.recruitment_job_workflow_steps with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy rjws_select_account on public.recruitment_job_workflow_steps using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy rjws_update_account on public.recruitment_job_workflow_steps using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can manage jobs" on public.recruitment_jobs using (((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can delete recruitment message templates" on public.recruitment_message_templates using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can insert recruitment message templates" on public.recruitment_message_templates with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can update recruitment message templates" on public.recruitment_message_templates using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can view recruitment message templates" on public.recruitment_message_templates using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can insert their org alerts" on public.recruitment_metric_alerts with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can update their org alerts" on public.recruitment_metric_alerts using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can view their org alerts" on public.recruitment_metric_alerts using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can insert their org thresholds" on public.recruitment_metric_thresholds with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can update their org thresholds" on public.recruitment_metric_thresholds using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can view their org thresholds" on public.recruitment_metric_thresholds using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can delete own notes" on public.recruitment_notes using ((created_by = (select auth.uid())));
alter policy "Users can insert notes in their account" on public.recruitment_notes with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can update own notes" on public.recruitment_notes using ((created_by = (select auth.uid())));
alter policy "Users can view notes in their account" on public.recruitment_notes using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Admins and owners can manage notification settings" on public.recruitment_notification_settings using ((is_account_admin_or_owner((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_admin_or_owner((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can view their account notification settings" on public.recruitment_notification_settings using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can create org campaigns" on public.recruitment_outreach_campaigns with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can delete org campaigns" on public.recruitment_outreach_campaigns using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update org campaigns" on public.recruitment_outreach_campaigns using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view org campaigns" on public.recruitment_outreach_campaigns using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can manage org conversations" on public.recruitment_outreach_conversations using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can manage org queue" on public.recruitment_outreach_queue using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can delete proposal templates from their organization" on public.recruitment_proposal_templates using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can insert proposal templates for their organization" on public.recruitment_proposal_templates with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can update proposal templates in their organization" on public.recruitment_proposal_templates using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can view proposal templates from their organization" on public.recruitment_proposal_templates using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can delete proposals from their organization" on public.recruitment_proposals using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can insert proposals for their organization" on public.recruitment_proposals with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can update proposals in their organization" on public.recruitment_proposals using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can view proposals from their organization" on public.recruitment_proposals using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can insert scheduled notifications" on public.recruitment_scheduled_notifications with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can update scheduled notifications" on public.recruitment_scheduled_notifications using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can view scheduled notifications" on public.recruitment_scheduled_notifications using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can create criteria for their templates" on public.recruitment_scorecard_criteria with check ((EXISTS ( SELECT 1
   FROM recruitment_scorecard_templates rst
  WHERE ((rst.id = recruitment_scorecard_criteria.template_id) AND (is_account_member((select auth.uid()), rst.account_id) OR can_edit_client_project((select auth.uid()), rst.account_id))))));
alter policy "Users can delete criteria from their templates" on public.recruitment_scorecard_criteria using ((EXISTS ( SELECT 1
   FROM recruitment_scorecard_templates rst
  WHERE ((rst.id = recruitment_scorecard_criteria.template_id) AND (is_account_member((select auth.uid()), rst.account_id) OR can_edit_client_project((select auth.uid()), rst.account_id))))));
alter policy "Users can update criteria from their templates" on public.recruitment_scorecard_criteria using ((EXISTS ( SELECT 1
   FROM recruitment_scorecard_templates rst
  WHERE ((rst.id = recruitment_scorecard_criteria.template_id) AND (is_account_member((select auth.uid()), rst.account_id) OR can_edit_client_project((select auth.uid()), rst.account_id))))));
alter policy "Users can view criteria from their templates" on public.recruitment_scorecard_criteria using ((EXISTS ( SELECT 1
   FROM recruitment_scorecard_templates rst
  WHERE ((rst.id = recruitment_scorecard_criteria.template_id) AND (is_account_member((select auth.uid()), rst.account_id) OR can_edit_client_project((select auth.uid()), rst.account_id))))));
alter policy "Users can create scorecard templates for their account" on public.recruitment_scorecard_templates with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can delete scorecard templates from their account" on public.recruitment_scorecard_templates using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can update scorecard templates from their account" on public.recruitment_scorecard_templates using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can view scorecard templates from their account" on public.recruitment_scorecard_templates using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can read screening results" on public.recruitment_screening_results using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = recruitment_screening_results.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Members can delete shortlist items" on public.recruitment_shortlist_items using ((shortlist_id IN ( SELECT recruitment_shortlists.id
   FROM recruitment_shortlists
  WHERE (recruitment_shortlists.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))))));
alter policy "Members can manage shortlist items" on public.recruitment_shortlist_items with check ((shortlist_id IN ( SELECT recruitment_shortlists.id
   FROM recruitment_shortlists
  WHERE (recruitment_shortlists.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))))));
alter policy "Members can update shortlist items" on public.recruitment_shortlist_items using ((shortlist_id IN ( SELECT recruitment_shortlists.id
   FROM recruitment_shortlists
  WHERE (recruitment_shortlists.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))))));
alter policy "Members can view shortlist items" on public.recruitment_shortlist_items using ((shortlist_id IN ( SELECT recruitment_shortlists.id
   FROM recruitment_shortlists
  WHERE (recruitment_shortlists.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))))));
alter policy "Members can create org shortlists" on public.recruitment_shortlists with check ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can delete org shortlists" on public.recruitment_shortlists using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can update org shortlists" on public.recruitment_shortlists using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can view org shortlists" on public.recruitment_shortlists using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Account admins can delete recruitment source spend" on public.recruitment_source_spend using ((is_account_admin_or_owner((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account admins can insert recruitment source spend" on public.recruitment_source_spend with check ((is_account_admin_or_owner((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account admins can update recruitment source spend" on public.recruitment_source_spend using ((is_account_admin_or_owner((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_admin_or_owner((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Account members can read recruitment source spend" on public.recruitment_source_spend using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members and platform admins can view credits" on public.recruitment_usage_credits using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id) OR is_super_admin((select auth.uid()))));
alter policy "Members and platform admins can view usage log" on public.recruitment_usage_log using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id) OR is_super_admin((select auth.uid()))));
alter policy "Account admins can delete whatsapp config" on public.recruitment_whatsapp_config using (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Account admins can insert whatsapp config" on public.recruitment_whatsapp_config with check (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Account admins can update whatsapp config" on public.recruitment_whatsapp_config using (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Account members can view whatsapp config" on public.recruitment_whatsapp_config using (is_account_member((select auth.uid()), account_id));
alter policy "EP team can read resource allocation snapshots" on public.resource_allocation_history using ((has_role((select auth.uid()), 'super_admin'::app_role) OR has_role((select auth.uid()), 'head_cs'::app_role) OR has_role((select auth.uid()), 'ep_consultant'::app_role) OR has_role((select auth.uid()), 'ep_partner'::app_role)));
alter policy "Head CS can create resource allocation snapshots" on public.resource_allocation_history with check ((has_role((select auth.uid()), 'super_admin'::app_role) OR has_role((select auth.uid()), 'head_cs'::app_role)));
alter policy "Head CS can delete resource allocation snapshots" on public.resource_allocation_history using ((has_role((select auth.uid()), 'super_admin'::app_role) OR has_role((select auth.uid()), 'head_cs'::app_role)));
alter policy "Members can manage ritual items" on public.ritual_items using ((EXISTS ( SELECT 1
   FROM ritual_sessions rs
  WHERE ((rs.id = ritual_items.session_id) AND ((rs.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), rs.account_id) OR can_edit_client_project((select auth.uid()), rs.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM ritual_sessions rs
  WHERE ((rs.id = ritual_items.session_id) AND ((rs.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), rs.account_id) OR can_edit_client_project((select auth.uid()), rs.account_id))))));
alter policy "Members can create account ritual sessions" on public.ritual_sessions with check ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can delete account ritual sessions" on public.ritual_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can update account ritual sessions" on public.ritual_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view account ritual sessions" on public.ritual_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can manage ritual history" on public.ritual_version_history using ((EXISTS ( SELECT 1
   FROM ritual_sessions rs
  WHERE ((rs.id = ritual_version_history.session_id) AND ((rs.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), rs.account_id) OR can_edit_client_project((select auth.uid()), rs.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM ritual_sessions rs
  WHERE ((rs.id = ritual_version_history.session_id) AND ((rs.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), rs.account_id) OR can_edit_client_project((select auth.uid()), rs.account_id))))));
alter policy "Members can create roip answers" on public.roip_answers with check ((EXISTS ( SELECT 1
   FROM roip_assessments a
  WHERE ((a.id = roip_answers.roip_assessment_id) AND ((a.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), a.account_id) OR can_edit_client_project((select auth.uid()), a.account_id))))));
alter policy "Members can delete roip answers" on public.roip_answers using ((EXISTS ( SELECT 1
   FROM roip_assessments a
  WHERE ((a.id = roip_answers.roip_assessment_id) AND ((a.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), a.account_id) OR can_edit_client_project((select auth.uid()), a.account_id))))));
alter policy "Members can update roip answers" on public.roip_answers using ((EXISTS ( SELECT 1
   FROM roip_assessments a
  WHERE ((a.id = roip_answers.roip_assessment_id) AND ((a.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), a.account_id) OR can_edit_client_project((select auth.uid()), a.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM roip_assessments a
  WHERE ((a.id = roip_answers.roip_assessment_id) AND ((a.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), a.account_id) OR can_edit_client_project((select auth.uid()), a.account_id))))));
alter policy "Members can view roip answers" on public.roip_answers using ((EXISTS ( SELECT 1
   FROM roip_assessments a
  WHERE ((a.id = roip_answers.roip_assessment_id) AND ((a.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), a.account_id) OR can_edit_client_project((select auth.uid()), a.account_id))))));
alter policy "Members can create roip assessments" on public.roip_assessments with check ((((select auth.uid()) = user_id) AND ((account_id IS NULL) OR is_account_member((select auth.uid()), account_id))));
alter policy "Members can delete roip assessments" on public.roip_assessments using ((((select auth.uid()) = user_id) OR is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update roip assessments" on public.roip_assessments using ((((select auth.uid()) = user_id) OR is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((((select auth.uid()) = user_id) OR is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view roip assessments" on public.roip_assessments using ((((select auth.uid()) = user_id) OR is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can create roip results" on public.roip_results with check ((EXISTS ( SELECT 1
   FROM roip_assessments a
  WHERE ((a.id = roip_results.roip_assessment_id) AND ((a.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), a.account_id) OR can_edit_client_project((select auth.uid()), a.account_id))))));
alter policy "Members can delete roip results" on public.roip_results using ((EXISTS ( SELECT 1
   FROM roip_assessments a
  WHERE ((a.id = roip_results.roip_assessment_id) AND ((a.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), a.account_id) OR can_edit_client_project((select auth.uid()), a.account_id))))));
alter policy "Members can update roip results" on public.roip_results using ((EXISTS ( SELECT 1
   FROM roip_assessments a
  WHERE ((a.id = roip_results.roip_assessment_id) AND ((a.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), a.account_id) OR can_edit_client_project((select auth.uid()), a.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM roip_assessments a
  WHERE ((a.id = roip_results.roip_assessment_id) AND ((a.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), a.account_id) OR can_edit_client_project((select auth.uid()), a.account_id))))));
alter policy "Members can view roip results" on public.roip_results using ((EXISTS ( SELECT 1
   FROM roip_assessments a
  WHERE ((a.id = roip_results.roip_assessment_id) AND ((a.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), a.account_id) OR can_edit_client_project((select auth.uid()), a.account_id))))));
alter policy "Members can create roip simulations" on public.roip_simulations with check ((((select auth.uid()) = user_id) AND ((account_id IS NULL) OR is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))));
alter policy "Members can delete roip simulations" on public.roip_simulations using ((((select auth.uid()) = user_id) OR is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update roip simulations" on public.roip_simulations using ((((select auth.uid()) = user_id) OR is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((((select auth.uid()) = user_id) OR is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view roip simulations" on public.roip_simulations using ((((select auth.uid()) = user_id) OR is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can manage salary history of their account" on public.salary_history using ((employee_position_id IN ( SELECT ep.id
   FROM ((((employee_positions ep
     JOIN position_levels pl ON ((pl.id = ep.level_id)))
     JOIN positions p ON ((p.id = pl.position_id)))
     JOIN job_families jf ON ((jf.id = p.family_id)))
     JOIN compensation_models cm ON ((cm.id = jf.model_id)))
  WHERE (cm.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can view salary history of their account" on public.salary_history using ((employee_position_id IN ( SELECT ep.id
   FROM ((((employee_positions ep
     JOIN position_levels pl ON ((pl.id = ep.level_id)))
     JOIN positions p ON ((p.id = pl.position_id)))
     JOIN job_families jf ON ((jf.id = p.family_id)))
     JOIN compensation_models cm ON ((cm.id = jf.model_id)))
  WHERE (cm.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can manage salary ranges of their account" on public.salary_ranges using ((level_id IN ( SELECT pl.id
   FROM (((position_levels pl
     JOIN positions p ON ((p.id = pl.position_id)))
     JOIN job_families jf ON ((jf.id = p.family_id)))
     JOIN compensation_models cm ON ((cm.id = jf.model_id)))
  WHERE (cm.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can view salary ranges of their account" on public.salary_ranges using ((level_id IN ( SELECT pl.id
   FROM (((position_levels pl
     JOIN positions p ON ((p.id = pl.position_id)))
     JOIN job_families jf ON ((jf.id = p.family_id)))
     JOIN compensation_models cm ON ((cm.id = jf.model_id)))
  WHERE (cm.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Members can insert demo logs for their account" on public.sales_demo_logs with check ((is_account_member((select auth.uid()), account_id) AND (conducted_by = (select auth.uid()))));
alter policy "Members can view demo logs of their account" on public.sales_demo_logs using (is_account_member((select auth.uid()), account_id));
alter policy "Members can create account sessions" on public.selling_company_sessions with check (is_account_member((select auth.uid()), account_id));
alter policy "Members can delete account sessions" on public.selling_company_sessions using (is_account_member((select auth.uid()), account_id));
alter policy "Members can insert selling sessions" on public.selling_company_sessions with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update account sessions" on public.selling_company_sessions using (is_account_member((select auth.uid()), account_id));
alter policy "Members can update selling sessions" on public.selling_company_sessions using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view account sessions" on public.selling_company_sessions using (is_account_member((select auth.uid()), account_id));
alter policy "Members can view selling sessions" on public.selling_company_sessions using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can create session versions" on public.selling_company_versions with check ((EXISTS ( SELECT 1
   FROM selling_company_sessions s
  WHERE ((s.id = selling_company_versions.session_id) AND (is_account_member((select auth.uid()), s.account_id) OR can_edit_client_project((select auth.uid()), s.account_id))))));
alter policy "Members can delete session versions" on public.selling_company_versions using ((EXISTS ( SELECT 1
   FROM selling_company_sessions s
  WHERE ((s.id = selling_company_versions.session_id) AND (is_account_member((select auth.uid()), s.account_id) OR can_edit_client_project((select auth.uid()), s.account_id))))));
alter policy "Members can update session versions" on public.selling_company_versions using ((EXISTS ( SELECT 1
   FROM selling_company_sessions s
  WHERE ((s.id = selling_company_versions.session_id) AND (is_account_member((select auth.uid()), s.account_id) OR can_edit_client_project((select auth.uid()), s.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM selling_company_sessions s
  WHERE ((s.id = selling_company_versions.session_id) AND (is_account_member((select auth.uid()), s.account_id) OR can_edit_client_project((select auth.uid()), s.account_id))))));
alter policy "Members can view session versions" on public.selling_company_versions using ((EXISTS ( SELECT 1
   FROM selling_company_sessions s
  WHERE ((s.id = selling_company_versions.session_id) AND (is_account_member((select auth.uid()), s.account_id) OR can_edit_client_project((select auth.uid()), s.account_id))))));
alter policy "Source account can update their pool entries" on public.shared_talent_pool using ((source_account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can create reports" on public.shortlist_relatorios with check ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = shortlist_relatorios.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Members can manage reports" on public.shortlist_relatorios using (((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = shortlist_relatorios.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update own account reports" on public.shortlist_relatorios using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = shortlist_relatorios.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Members can view own account reports" on public.shortlist_relatorios using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = shortlist_relatorios.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Members manage org sla alerts" on public.sla_alertas using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true))))) with check ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members view org sla alerts" on public.sla_alertas using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can create account indicators" on public.strategic_indicators with check ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can delete account indicators" on public.strategic_indicators using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can update account indicators" on public.strategic_indicators using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view account indicators" on public.strategic_indicators using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can create account projects" on public.strategic_projects with check ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can delete account projects" on public.strategic_projects using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can update account projects" on public.strategic_projects using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view account projects" on public.strategic_projects using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "EP consultants can view success patterns" on public.success_patterns using ((is_ep_consultant((select auth.uid())) OR is_head_cs((select auth.uid())) OR is_super_admin((select auth.uid()))));
alter policy "Users can add messages to tickets" on public.support_ticket_messages with check (((author_id = (select auth.uid())) AND ((ticket_id IN ( SELECT t.id
   FROM support_tickets t
  WHERE (t.account_id IN ( SELECT am.account_id
           FROM account_members am
          WHERE ((am.user_id = (select auth.uid())) AND (am.is_active = true)))))) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = (select auth.uid())) AND (ur.role = ANY (ARRAY['super_admin'::app_role, 'head_cs'::app_role, 'ep_consultant'::app_role]))))))));
alter policy "Users can view ticket messages" on public.support_ticket_messages using ((((NOT is_internal) AND (ticket_id IN ( SELECT t.id
   FROM support_tickets t
  WHERE (t.account_id IN ( SELECT am.account_id
           FROM account_members am
          WHERE ((am.user_id = (select auth.uid())) AND (am.is_active = true))))))) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = (select auth.uid())) AND (ur.role = ANY (ARRAY['super_admin'::app_role, 'head_cs'::app_role, 'ep_consultant'::app_role])))))));
alter policy "Users and EP can update tickets" on public.support_tickets using (((created_by = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = (select auth.uid())) AND (ur.role = ANY (ARRAY['super_admin'::app_role, 'head_cs'::app_role, 'ep_consultant'::app_role]))))) OR (EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = support_tickets.account_id) AND (am.user_id = (select auth.uid())) AND (am.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])) AND (am.is_active = true))))));
alter policy "Users can create tickets for their account" on public.support_tickets with check (((account_id IN ( SELECT am.account_id
   FROM account_members am
  WHERE ((am.user_id = (select auth.uid())) AND (am.is_active = true)))) AND (created_by = (select auth.uid()))));
alter policy "Users can view their account tickets" on public.support_tickets using (((account_id IN ( SELECT am.account_id
   FROM account_members am
  WHERE ((am.user_id = (select auth.uid())) AND (am.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = (select auth.uid())) AND (ur.role = ANY (ARRAY['super_admin'::app_role, 'head_cs'::app_role, 'ep_consultant'::app_role])))))));
alter policy "Service role can insert suppressed emails" on public.suppressed_emails with check (((select auth.role()) = 'service_role'::text));
alter policy "Service role can read suppressed emails" on public.suppressed_emails using (((select auth.role()) = 'service_role'::text));
alter policy "Users can create answers" on public.survey_answers with check ((response_id IN ( SELECT survey_responses.id
   FROM survey_responses
  WHERE ((survey_responses.respondent_id = (select auth.uid())) OR (survey_responses.is_anonymous = true)))));
alter policy "Users can view answers" on public.survey_answers using ((response_id IN ( SELECT survey_responses.id
   FROM survey_responses
  WHERE ((survey_responses.survey_id IN ( SELECT surveys.id
           FROM surveys
          WHERE (surveys.account_id IN ( SELECT account_members.account_id
                   FROM account_members
                  WHERE (account_members.user_id = (select auth.uid())))))) OR (survey_responses.respondent_id = (select auth.uid()))))));
alter policy "Users can create invitations for own account surveys" on public.survey_invitations with check ((survey_id IN ( SELECT surveys.id
   FROM surveys
  WHERE (surveys.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can update own invitations or account invitations" on public.survey_invitations using (((survey_id IN ( SELECT surveys.id
   FROM surveys
  WHERE (surveys.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))) OR (user_id = (select auth.uid()))));
alter policy "Users can view invitations for own account surveys or own invit" on public.survey_invitations using (((survey_id IN ( SELECT surveys.id
   FROM surveys
  WHERE (surveys.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))) OR (user_id = (select auth.uid()))));
alter policy "Users can manage survey questions" on public.survey_questions using ((survey_id IN ( SELECT surveys.id
   FROM surveys
  WHERE (surveys.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can view survey questions" on public.survey_questions using ((survey_id IN ( SELECT surveys.id
   FROM surveys
  WHERE (surveys.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can create responses" on public.survey_responses with check (((respondent_id = (select auth.uid())) OR (is_anonymous = true)));
alter policy "Users can update own responses" on public.survey_responses using ((respondent_id = (select auth.uid())));
alter policy "Users can view responses for own account surveys" on public.survey_responses using (((survey_id IN ( SELECT surveys.id
   FROM surveys
  WHERE (surveys.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))) OR (respondent_id = (select auth.uid()))));
alter policy "Users can create schedules for their account surveys" on public.survey_schedules with check ((EXISTS ( SELECT 1
   FROM surveys s
  WHERE ((s.id = survey_schedules.survey_id) AND is_account_member((select auth.uid()), s.account_id)))));
alter policy "Users can delete schedules for their account surveys" on public.survey_schedules using ((EXISTS ( SELECT 1
   FROM surveys s
  WHERE ((s.id = survey_schedules.survey_id) AND is_account_member((select auth.uid()), s.account_id)))));
alter policy "Users can update schedules for their account surveys" on public.survey_schedules using ((EXISTS ( SELECT 1
   FROM surveys s
  WHERE ((s.id = survey_schedules.survey_id) AND is_account_member((select auth.uid()), s.account_id)))));
alter policy "Users can view schedules for their account surveys" on public.survey_schedules using ((EXISTS ( SELECT 1
   FROM surveys s
  WHERE ((s.id = survey_schedules.survey_id) AND is_account_member((select auth.uid()), s.account_id)))));
alter policy "Users can manage template questions" on public.survey_template_questions using ((template_id IN ( SELECT survey_templates.id
   FROM survey_templates
  WHERE (survey_templates.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))))));
alter policy "Users can view template questions" on public.survey_template_questions using ((template_id IN ( SELECT survey_templates.id
   FROM survey_templates
  WHERE ((survey_templates.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid())))) OR (survey_templates.is_public = true)))));
alter policy "Users can create templates for own account" on public.survey_templates with check ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))));
alter policy "Users can delete own account templates" on public.survey_templates using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))));
alter policy "Users can update own account templates" on public.survey_templates using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))));
alter policy "Users can view own account templates" on public.survey_templates using (((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))) OR (is_public = true)));
alter policy "Users can create surveys for own account" on public.surveys with check ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))));
alter policy "Users can delete own account surveys" on public.surveys using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))));
alter policy "Users can update own account surveys" on public.surveys using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))));
alter policy "Users can view own account surveys" on public.surveys using ((account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))));
alter policy "Members can create talent bank matches" on public.talent_bank_matches with check (is_account_member((select auth.uid()), account_id));
alter policy "Members can delete talent bank matches" on public.talent_bank_matches using (is_account_member((select auth.uid()), account_id));
alter policy "Members can update talent bank matches" on public.talent_bank_matches using (is_account_member((select auth.uid()), account_id));
alter policy "Members can view talent bank matches" on public.talent_bank_matches using (is_account_member((select auth.uid()), account_id));
alter policy "Account members can manage talent pool" on public.talent_pool using (is_account_member((select auth.uid()), account_id));
alter policy "Account members can view talent pool" on public.talent_pool using (is_account_member((select auth.uid()), account_id));
alter policy "Members can manage talent pool" on public.talent_pool using ((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.account_id = talent_pool.account_id) AND (account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Members can view talent pool" on public.talent_pool using ((EXISTS ( SELECT 1
   FROM account_members
  WHERE ((account_members.account_id = talent_pool.account_id) AND (account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Insert own unlocks" on public.talent_pool_unlocks with check ((buyer_account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Update own unlocks" on public.talent_pool_unlocks using ((buyer_account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "View own unlocks" on public.talent_pool_unlocks using ((buyer_account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))));
alter policy "Organizations can view their own pool views" on public.talent_pool_views using (((viewer_account_id IN ( SELECT account_members.account_id
   FROM account_members
  WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true)))) OR (talent_pool_id IN ( SELECT shared_talent_pool.id
   FROM shared_talent_pool
  WHERE (shared_talent_pool.source_account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.is_active = true))))))));
alter policy "Admins can create AI analyses" on public.team_maturity_ai_analyses with check ((EXISTS ( SELECT 1
   FROM team_maturity_assessments tma
  WHERE ((tma.id = team_maturity_ai_analyses.assessment_id) AND is_account_admin_or_owner((select auth.uid()), tma.account_id)))));
alter policy "Admins can delete AI analyses" on public.team_maturity_ai_analyses using ((EXISTS ( SELECT 1
   FROM team_maturity_assessments tma
  WHERE ((tma.id = team_maturity_ai_analyses.assessment_id) AND is_account_admin_or_owner((select auth.uid()), tma.account_id)))));
alter policy "Admins can view AI analyses" on public.team_maturity_ai_analyses using ((EXISTS ( SELECT 1
   FROM team_maturity_assessments tma
  WHERE ((tma.id = team_maturity_ai_analyses.assessment_id) AND is_account_admin_or_owner((select auth.uid()), tma.account_id)))));
alter policy "Admins can create team maturity assessments" on public.team_maturity_assessments with check (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Admins can delete team maturity assessments" on public.team_maturity_assessments using (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Admins can update team maturity assessments" on public.team_maturity_assessments using (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Admins can view team maturity assessments" on public.team_maturity_assessments using (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Members can delete team maturity assessments" on public.team_maturity_assessments using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can insert team maturity assessments" on public.team_maturity_assessments with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update team maturity assessments" on public.team_maturity_assessments using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view team maturity assessments" on public.team_maturity_assessments using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Admins can create team maturity points" on public.team_maturity_points with check ((EXISTS ( SELECT 1
   FROM team_maturity_assessments tma
  WHERE ((tma.id = team_maturity_points.assessment_id) AND is_account_admin_or_owner((select auth.uid()), tma.account_id)))));
alter policy "Admins can delete team maturity points" on public.team_maturity_points using ((EXISTS ( SELECT 1
   FROM team_maturity_assessments tma
  WHERE ((tma.id = team_maturity_points.assessment_id) AND is_account_admin_or_owner((select auth.uid()), tma.account_id)))));
alter policy "Admins can update team maturity points" on public.team_maturity_points using ((EXISTS ( SELECT 1
   FROM team_maturity_assessments tma
  WHERE ((tma.id = team_maturity_points.assessment_id) AND is_account_admin_or_owner((select auth.uid()), tma.account_id)))));
alter policy "Admins can view team maturity points" on public.team_maturity_points using ((EXISTS ( SELECT 1
   FROM team_maturity_assessments tma
  WHERE ((tma.id = team_maturity_points.assessment_id) AND is_account_admin_or_owner((select auth.uid()), tma.account_id)))));
alter policy "Admins can create team maturity version history" on public.team_maturity_version_history with check ((EXISTS ( SELECT 1
   FROM team_maturity_assessments tma
  WHERE ((tma.id = team_maturity_version_history.assessment_id) AND is_account_admin_or_owner((select auth.uid()), tma.account_id)))));
alter policy "Admins can delete team maturity version history" on public.team_maturity_version_history using ((EXISTS ( SELECT 1
   FROM team_maturity_assessments tma
  WHERE ((tma.id = team_maturity_version_history.assessment_id) AND is_account_admin_or_owner((select auth.uid()), tma.account_id)))));
alter policy "Admins can view team maturity version history" on public.team_maturity_version_history using ((EXISTS ( SELECT 1
   FROM team_maturity_assessments tma
  WHERE ((tma.id = team_maturity_version_history.assessment_id) AND is_account_admin_or_owner((select auth.uid()), tma.account_id)))));
alter policy "Account members can manage technical responses" on public.technical_interview_responses using ((EXISTS ( SELECT 1
   FROM (technical_interview_sessions tis
     JOIN account_members am ON ((am.account_id = tis.account_id)))
  WHERE ((tis.id = technical_interview_responses.session_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Account members can view technical responses" on public.technical_interview_responses using ((EXISTS ( SELECT 1
   FROM (technical_interview_sessions tis
     JOIN account_members am ON ((am.account_id = tis.account_id)))
  WHERE ((tis.id = technical_interview_responses.session_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Service role bypass for responses" on public.technical_interview_responses using ((((select auth.jwt()) ->> 'role'::text) = 'service_role'::text));
alter policy "Authenticated users can read resume intelligence for their acco" on public.technical_interview_resume_intelligence using ((EXISTS ( SELECT 1
   FROM (technical_interview_sessions tis
     JOIN account_members am ON ((am.account_id = tis.account_id)))
  WHERE ((tis.id = technical_interview_resume_intelligence.session_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Members and consultants can manage technical sessions" on public.technical_interview_sessions using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id) OR is_super_admin((select auth.uid()))));
alter policy "Members and consultants can view technical sessions" on public.technical_interview_sessions using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id) OR is_super_admin((select auth.uid())) OR (candidate_profile_id IN ( SELECT candidate_profiles.id
   FROM candidate_profiles
  WHERE (candidate_profiles.user_id = (select auth.uid()))))));
alter policy "Service role bypass for sessions" on public.technical_interview_sessions using ((((select auth.jwt()) ->> 'role'::text) = 'service_role'::text));
alter policy "Account members can manage question bank" on public.technical_question_bank using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = technical_question_bank.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Account members can view question bank" on public.technical_question_bank using ((EXISTS ( SELECT 1
   FROM account_members am
  WHERE ((am.account_id = technical_question_bank.account_id) AND (am.user_id = (select auth.uid())) AND (am.is_active = true)))));
alter policy "Service role bypass for question bank" on public.technical_question_bank using ((((select auth.jwt()) ->> 'role'::text) = 'service_role'::text));
alter policy "Admins can manage template permissions" on public.template_permissions using ((template_id IN ( SELECT pt.id
   FROM permission_templates pt
  WHERE (pt.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])))))))) with check ((template_id IN ( SELECT pt.id
   FROM permission_templates pt
  WHERE (pt.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role]))))))));
alter policy "Users can read template permissions" on public.template_permissions using ((template_id IN ( SELECT permission_templates.id
   FROM permission_templates
  WHERE ((permission_templates.is_system_default = true) OR (permission_templates.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE (account_members.user_id = (select auth.uid()))))))));
alter policy "Admins can create unique ability activities" on public.unique_ability_activities with check ((EXISTS ( SELECT 1
   FROM unique_ability_analyses ua
  WHERE ((ua.id = unique_ability_activities.analysis_id) AND is_account_admin_or_owner((select auth.uid()), ua.account_id)))));
alter policy "Admins can delete unique ability activities" on public.unique_ability_activities using ((EXISTS ( SELECT 1
   FROM unique_ability_analyses ua
  WHERE ((ua.id = unique_ability_activities.analysis_id) AND is_account_admin_or_owner((select auth.uid()), ua.account_id)))));
alter policy "Admins can update unique ability activities" on public.unique_ability_activities using ((EXISTS ( SELECT 1
   FROM unique_ability_analyses ua
  WHERE ((ua.id = unique_ability_activities.analysis_id) AND is_account_admin_or_owner((select auth.uid()), ua.account_id)))));
alter policy "Admins can view unique ability activities" on public.unique_ability_activities using ((EXISTS ( SELECT 1
   FROM unique_ability_analyses ua
  WHERE ((ua.id = unique_ability_activities.analysis_id) AND is_account_admin_or_owner((select auth.uid()), ua.account_id)))));
alter policy "Admins can create unique ability analyses" on public.unique_ability_analyses with check (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Admins can delete unique ability analyses" on public.unique_ability_analyses using (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Admins can update unique ability analyses" on public.unique_ability_analyses using (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Admins can view unique ability analyses" on public.unique_ability_analyses using (is_account_admin_or_owner((select auth.uid()), account_id));
alter policy "Members can delete unique ability analyses" on public.unique_ability_analyses using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can insert unique ability analyses" on public.unique_ability_analyses with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update unique ability analyses" on public.unique_ability_analyses using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view unique ability analyses" on public.unique_ability_analyses using ((is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Admins can create unique ability version history" on public.unique_ability_version_history with check ((EXISTS ( SELECT 1
   FROM unique_ability_analyses ua
  WHERE ((ua.id = unique_ability_version_history.analysis_id) AND is_account_admin_or_owner((select auth.uid()), ua.account_id)))));
alter policy "Admins can delete unique ability version history" on public.unique_ability_version_history using ((EXISTS ( SELECT 1
   FROM unique_ability_analyses ua
  WHERE ((ua.id = unique_ability_version_history.analysis_id) AND is_account_admin_or_owner((select auth.uid()), ua.account_id)))));
alter policy "Admins can view unique ability version history" on public.unique_ability_version_history using ((EXISTS ( SELECT 1
   FROM unique_ability_analyses ua
  WHERE ((ua.id = unique_ability_version_history.analysis_id) AND is_account_admin_or_owner((select auth.uid()), ua.account_id)))));
alter policy "Users can insert their own badges" on public.user_badges with check (((select auth.uid()) = user_id));
alter policy "Users can update their own badges" on public.user_badges using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "Users can view their own badges" on public.user_badges using (((select auth.uid()) = user_id));
alter policy "Admins can manage user permissions" on public.user_permissions using ((account_member_id IN ( SELECT am.id
   FROM account_members am
  WHERE (am.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])))))))) with check ((account_member_id IN ( SELECT am.id
   FROM account_members am
  WHERE (am.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role]))))))));
alter policy "Users can read own permissions" on public.user_permissions using (((account_member_id IN ( SELECT account_members.id
   FROM account_members
  WHERE (account_members.user_id = (select auth.uid())))) OR (account_member_id IN ( SELECT am.id
   FROM account_members am
  WHERE (am.account_id IN ( SELECT account_members.account_id
           FROM account_members
          WHERE ((account_members.user_id = (select auth.uid())) AND (account_members.role = ANY (ARRAY['owner'::account_role, 'admin'::account_role])))))))));
alter policy "Authorized users can manage roles" on public.user_roles using ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid())))) with check ((is_super_admin((select auth.uid())) OR is_head_cs((select auth.uid()))));
alter policy "Users can view own roles or super admins can view all" on public.user_roles using (((user_id = (select auth.uid())) OR is_super_admin((select auth.uid()))));
alter policy "Members can manage behavior options" on public.values_behaviors_options using ((EXISTS ( SELECT 1
   FROM values_sessions vs
  WHERE ((vs.id = values_behaviors_options.session_id) AND (is_account_member((select auth.uid()), vs.account_id) OR (vs.user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), vs.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM values_sessions vs
  WHERE ((vs.id = values_behaviors_options.session_id) AND (is_account_member((select auth.uid()), vs.account_id) OR (vs.user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), vs.account_id))))));
alter policy "Members can manage behavior selections" on public.values_behaviors_selections using ((EXISTS ( SELECT 1
   FROM values_sessions vs
  WHERE ((vs.id = values_behaviors_selections.session_id) AND (is_account_member((select auth.uid()), vs.account_id) OR (vs.user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), vs.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM values_sessions vs
  WHERE ((vs.id = values_behaviors_selections.session_id) AND (is_account_member((select auth.uid()), vs.account_id) OR (vs.user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), vs.account_id))))));
alter policy "Members can manage company info" on public.values_company_info using ((EXISTS ( SELECT 1
   FROM values_sessions vs
  WHERE ((vs.id = values_company_info.session_id) AND (is_account_member((select auth.uid()), vs.account_id) OR (vs.user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), vs.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM values_sessions vs
  WHERE ((vs.id = values_company_info.session_id) AND (is_account_member((select auth.uid()), vs.account_id) OR (vs.user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), vs.account_id))))));
alter policy "Members can manage final check" on public.values_final_check using ((EXISTS ( SELECT 1
   FROM values_sessions vs
  WHERE ((vs.id = values_final_check.session_id) AND (is_account_member((select auth.uid()), vs.account_id) OR (vs.user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), vs.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM values_sessions vs
  WHERE ((vs.id = values_final_check.session_id) AND (is_account_member((select auth.uid()), vs.account_id) OR (vs.user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), vs.account_id))))));
alter policy "Members can manage open answers" on public.values_open_answers using ((EXISTS ( SELECT 1
   FROM values_sessions vs
  WHERE ((vs.id = values_open_answers.session_id) AND (is_account_member((select auth.uid()), vs.account_id) OR (vs.user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), vs.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM values_sessions vs
  WHERE ((vs.id = values_open_answers.session_id) AND (is_account_member((select auth.uid()), vs.account_id) OR (vs.user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), vs.account_id))))));
alter policy "Members can manage questions items" on public.values_questions_items using ((EXISTS ( SELECT 1
   FROM values_questions_sessions s
  WHERE ((s.id = values_questions_items.session_id) AND ((s.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), s.account_id) OR can_edit_client_project((select auth.uid()), s.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM values_questions_sessions s
  WHERE ((s.id = values_questions_items.session_id) AND ((s.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), s.account_id) OR can_edit_client_project((select auth.uid()), s.account_id))))));
alter policy "Members can create account sessions" on public.values_questions_sessions with check ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can delete account sessions" on public.values_questions_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can insert questions sessions" on public.values_questions_sessions with check (((user_id = (select auth.uid())) OR is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can update account sessions" on public.values_questions_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can update questions sessions" on public.values_questions_sessions using (((user_id = (select auth.uid())) OR is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id))) with check (((user_id = (select auth.uid())) OR is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view account sessions" on public.values_questions_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can view questions sessions" on public.values_questions_sessions using (((user_id = (select auth.uid())) OR is_account_member((select auth.uid()), account_id) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can manage version history" on public.values_questions_version_history using ((EXISTS ( SELECT 1
   FROM values_questions_sessions s
  WHERE ((s.id = values_questions_version_history.session_id) AND (is_account_member((select auth.uid()), s.account_id) OR (s.user_id = (select auth.uid())))))));
alter policy "Members can manage ratings" on public.values_ratings using ((EXISTS ( SELECT 1
   FROM values_sessions vs
  WHERE ((vs.id = values_ratings.session_id) AND (is_account_member((select auth.uid()), vs.account_id) OR (vs.user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), vs.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM values_sessions vs
  WHERE ((vs.id = values_ratings.session_id) AND (is_account_member((select auth.uid()), vs.account_id) OR (vs.user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), vs.account_id))))));
alter policy "Members can manage selections" on public.values_selections using ((EXISTS ( SELECT 1
   FROM values_sessions vs
  WHERE ((vs.id = values_selections.session_id) AND (is_account_member((select auth.uid()), vs.account_id) OR (vs.user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), vs.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM values_sessions vs
  WHERE ((vs.id = values_selections.session_id) AND (is_account_member((select auth.uid()), vs.account_id) OR (vs.user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), vs.account_id))))));
alter policy "Members can create account values sessions" on public.values_sessions with check ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can delete account values sessions" on public.values_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can update account values sessions" on public.values_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view account values sessions" on public.values_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can manage values history" on public.values_version_history using ((EXISTS ( SELECT 1
   FROM values_sessions vs
  WHERE ((vs.id = values_version_history.session_id) AND ((vs.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), vs.account_id) OR can_edit_client_project((select auth.uid()), vs.account_id)))))) with check ((EXISTS ( SELECT 1
   FROM values_sessions vs
  WHERE ((vs.id = values_version_history.session_id) AND ((vs.user_id = (select auth.uid())) OR is_account_member((select auth.uid()), vs.account_id) OR can_edit_client_project((select auth.uid()), vs.account_id))))));
alter policy "Members can create account vision sessions" on public.vision_sessions with check ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can delete account vision sessions" on public.vision_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid()))));
alter policy "Members can update account vision sessions" on public.vision_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Members can view account vision sessions" on public.vision_sessions using ((is_account_member((select auth.uid()), account_id) OR (user_id = (select auth.uid())) OR can_edit_client_project((select auth.uid()), account_id)));
alter policy "Users can manage own vision history" on public.vision_version_history using ((EXISTS ( SELECT 1
   FROM vision_sessions
  WHERE ((vision_sessions.id = vision_version_history.session_id) AND (vision_sessions.user_id = (select auth.uid()))))));
alter policy "Account admins can update anomalies" on public.voice_interview_anomalies using ((is_account_member((select auth.uid()), account_id) OR is_super_admin((select auth.uid()))));
alter policy "Account members can view their anomalies" on public.voice_interview_anomalies using ((is_account_member((select auth.uid()), account_id) OR is_super_admin((select auth.uid()))));
alter policy "Account members can view voice events" on public.voice_interview_events using ((is_account_member((select auth.uid()), account_id) OR is_super_admin((select auth.uid()))));
alter policy "Super admins can insert simulations" on public.voice_interview_simulations with check (is_super_admin((select auth.uid())));
alter policy "Super admins can update simulations" on public.voice_interview_simulations using (is_super_admin((select auth.uid())));
alter policy "Super admins can view all simulations" on public.voice_interview_simulations using (is_super_admin((select auth.uid())));
alter policy whatsapp_message_logs_select on public.whatsapp_message_logs using (is_super_admin((select auth.uid())));
