
-- =====================================================
-- MIGRATION: Add can_edit_client_project to ALL recruitment tables
-- Enables EP Consultants to fully manage recruitment module in client accounts
-- =====================================================

-- =====================================================
-- GROUP 1: AGENTS (direct cause of reported error)
-- =====================================================

-- recruitment_agents (account_id direto)
DROP POLICY IF EXISTS "Users can view agents in their account" ON recruitment_agents;
DROP POLICY IF EXISTS "Users can create agents in their account" ON recruitment_agents;
DROP POLICY IF EXISTS "Users can update agents in their account" ON recruitment_agents;
DROP POLICY IF EXISTS "Users can delete agents in their account" ON recruitment_agents;

CREATE POLICY "Users can view agents in their account" ON recruitment_agents
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can create agents in their account" ON recruitment_agents
  FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can update agents in their account" ON recruitment_agents
  FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can delete agents in their account" ON recruitment_agents
  FOR DELETE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- recruitment_agent_criteria (child via agent_id)
DROP POLICY IF EXISTS "Users can view criteria of their agents" ON recruitment_agent_criteria;
DROP POLICY IF EXISTS "Users can create criteria for their agents" ON recruitment_agent_criteria;
DROP POLICY IF EXISTS "Users can update criteria of their agents" ON recruitment_agent_criteria;
DROP POLICY IF EXISTS "Users can delete criteria of their agents" ON recruitment_agent_criteria;

CREATE POLICY "Users can view criteria of their agents" ON recruitment_agent_criteria
  FOR SELECT USING (EXISTS (SELECT 1 FROM recruitment_agents ra WHERE ra.id = recruitment_agent_criteria.agent_id AND (is_account_member(auth.uid(), ra.account_id) OR can_edit_client_project(auth.uid(), ra.account_id))));
CREATE POLICY "Users can create criteria for their agents" ON recruitment_agent_criteria
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM recruitment_agents ra WHERE ra.id = recruitment_agent_criteria.agent_id AND (is_account_member(auth.uid(), ra.account_id) OR can_edit_client_project(auth.uid(), ra.account_id))));
CREATE POLICY "Users can update criteria of their agents" ON recruitment_agent_criteria
  FOR UPDATE USING (EXISTS (SELECT 1 FROM recruitment_agents ra WHERE ra.id = recruitment_agent_criteria.agent_id AND (is_account_member(auth.uid(), ra.account_id) OR can_edit_client_project(auth.uid(), ra.account_id))));
CREATE POLICY "Users can delete criteria of their agents" ON recruitment_agent_criteria
  FOR DELETE USING (EXISTS (SELECT 1 FROM recruitment_agents ra WHERE ra.id = recruitment_agent_criteria.agent_id AND (is_account_member(auth.uid(), ra.account_id) OR can_edit_client_project(auth.uid(), ra.account_id))));

-- recruitment_agent_prompts (child via agent_id)
DROP POLICY IF EXISTS "Users can view prompts for their account's agents" ON recruitment_agent_prompts;
DROP POLICY IF EXISTS "Users can insert prompts for their account's agents" ON recruitment_agent_prompts;
DROP POLICY IF EXISTS "Users can update prompts for their account's agents" ON recruitment_agent_prompts;
DROP POLICY IF EXISTS "Users can delete prompts for their account's agents" ON recruitment_agent_prompts;

CREATE POLICY "Users can view prompts for their account's agents" ON recruitment_agent_prompts
  FOR SELECT USING (EXISTS (SELECT 1 FROM recruitment_agents ra WHERE ra.id = recruitment_agent_prompts.agent_id AND (is_account_member(auth.uid(), ra.account_id) OR can_edit_client_project(auth.uid(), ra.account_id))));
CREATE POLICY "Users can insert prompts for their account's agents" ON recruitment_agent_prompts
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM recruitment_agents ra WHERE ra.id = recruitment_agent_prompts.agent_id AND (is_account_member(auth.uid(), ra.account_id) OR can_edit_client_project(auth.uid(), ra.account_id))));
CREATE POLICY "Users can update prompts for their account's agents" ON recruitment_agent_prompts
  FOR UPDATE USING (EXISTS (SELECT 1 FROM recruitment_agents ra WHERE ra.id = recruitment_agent_prompts.agent_id AND (is_account_member(auth.uid(), ra.account_id) OR can_edit_client_project(auth.uid(), ra.account_id))));
CREATE POLICY "Users can delete prompts for their account's agents" ON recruitment_agent_prompts
  FOR DELETE USING (EXISTS (SELECT 1 FROM recruitment_agents ra WHERE ra.id = recruitment_agent_prompts.agent_id AND (is_account_member(auth.uid(), ra.account_id) OR can_edit_client_project(auth.uid(), ra.account_id))));

-- recruitment_agent_questions (child via agent_id)
DROP POLICY IF EXISTS "Users can view questions of their agents" ON recruitment_agent_questions;
DROP POLICY IF EXISTS "Users can create questions for their agents" ON recruitment_agent_questions;
DROP POLICY IF EXISTS "Users can update questions of their agents" ON recruitment_agent_questions;
DROP POLICY IF EXISTS "Users can delete questions of their agents" ON recruitment_agent_questions;

CREATE POLICY "Users can view questions of their agents" ON recruitment_agent_questions
  FOR SELECT USING (EXISTS (SELECT 1 FROM recruitment_agents ra WHERE ra.id = recruitment_agent_questions.agent_id AND (is_account_member(auth.uid(), ra.account_id) OR can_edit_client_project(auth.uid(), ra.account_id))));
CREATE POLICY "Users can create questions for their agents" ON recruitment_agent_questions
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM recruitment_agents ra WHERE ra.id = recruitment_agent_questions.agent_id AND (is_account_member(auth.uid(), ra.account_id) OR can_edit_client_project(auth.uid(), ra.account_id))));
CREATE POLICY "Users can update questions of their agents" ON recruitment_agent_questions
  FOR UPDATE USING (EXISTS (SELECT 1 FROM recruitment_agents ra WHERE ra.id = recruitment_agent_questions.agent_id AND (is_account_member(auth.uid(), ra.account_id) OR can_edit_client_project(auth.uid(), ra.account_id))));
CREATE POLICY "Users can delete questions of their agents" ON recruitment_agent_questions
  FOR DELETE USING (EXISTS (SELECT 1 FROM recruitment_agents ra WHERE ra.id = recruitment_agent_questions.agent_id AND (is_account_member(auth.uid(), ra.account_id) OR can_edit_client_project(auth.uid(), ra.account_id))));

-- =====================================================
-- GROUP 2: CANDIDATES & APPLICATIONS
-- =====================================================

-- recruitment_candidates - preserve special policies (self-register, own record)
DROP POLICY IF EXISTS "Members can view candidates" ON recruitment_candidates;
DROP POLICY IF EXISTS "Members can insert candidates" ON recruitment_candidates;
DROP POLICY IF EXISTS "Members can update candidates" ON recruitment_candidates;
DROP POLICY IF EXISTS "Members can delete candidates" ON recruitment_candidates;
DROP POLICY IF EXISTS "Account members can view their candidates" ON recruitment_candidates;

CREATE POLICY "Members can view candidates" ON recruitment_candidates
  FOR SELECT TO authenticated USING (
    is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id)
  );
CREATE POLICY "Members can insert candidates" ON recruitment_candidates
  FOR INSERT TO authenticated WITH CHECK (
    is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id)
  );
CREATE POLICY "Members can update candidates" ON recruitment_candidates
  FOR UPDATE TO authenticated USING (
    is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id)
  );
CREATE POLICY "Members can delete candidates" ON recruitment_candidates
  FOR DELETE TO authenticated USING (
    is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id)
  );

-- recruitment_applications - preserve special policies (public insert, candidate self-view)
DROP POLICY IF EXISTS "Members can manage applications" ON recruitment_applications;

CREATE POLICY "Members can manage applications" ON recruitment_applications
  FOR ALL TO authenticated USING (
    is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id)
  ) WITH CHECK (
    is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id)
  );

-- recruitment_enriched_profiles (child via candidate_id)
DROP POLICY IF EXISTS "Users can view enriched profiles for their account candidates" ON recruitment_enriched_profiles;
DROP POLICY IF EXISTS "Users can insert enriched profiles for their account candidates" ON recruitment_enriched_profiles;
DROP POLICY IF EXISTS "Users can update enriched profiles for their account candidates" ON recruitment_enriched_profiles;

CREATE POLICY "Users can view enriched profiles for their account candidates" ON recruitment_enriched_profiles
  FOR SELECT USING (EXISTS (SELECT 1 FROM recruitment_candidates rc WHERE rc.id = recruitment_enriched_profiles.candidate_id AND (is_account_member(auth.uid(), rc.account_id) OR can_edit_client_project(auth.uid(), rc.account_id))));
CREATE POLICY "Users can insert enriched profiles for their account candidates" ON recruitment_enriched_profiles
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM recruitment_candidates rc WHERE rc.id = recruitment_enriched_profiles.candidate_id AND (is_account_member(auth.uid(), rc.account_id) OR can_edit_client_project(auth.uid(), rc.account_id))));
CREATE POLICY "Users can update enriched profiles for their account candidates" ON recruitment_enriched_profiles
  FOR UPDATE USING (EXISTS (SELECT 1 FROM recruitment_candidates rc WHERE rc.id = recruitment_enriched_profiles.candidate_id AND (is_account_member(auth.uid(), rc.account_id) OR can_edit_client_project(auth.uid(), rc.account_id))));

-- =====================================================
-- GROUP 3: INTERVIEWS & EVALUATIONS
-- =====================================================

-- recruitment_interviews - preserve token-based access policies
DROP POLICY IF EXISTS "Members can manage interviews" ON recruitment_interviews;
DROP POLICY IF EXISTS "Token-validated interview select" ON recruitment_interviews;
DROP POLICY IF EXISTS "Token-validated interview update" ON recruitment_interviews;

CREATE POLICY "Members can manage interviews" ON recruitment_interviews
  FOR ALL TO authenticated USING (
    is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id)
  ) WITH CHECK (
    is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id)
  );

CREATE POLICY "Token-validated interview select" ON recruitment_interviews
  FOR SELECT USING (
    (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id))
    OR (access_token IS NOT NULL AND access_token = ((current_setting('request.headers'::text, true))::json ->> 'x-interview-token'))
  );

CREATE POLICY "Token-validated interview update" ON recruitment_interviews
  FOR UPDATE USING (
    (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id))
    OR (access_token IS NOT NULL AND access_token = ((current_setting('request.headers'::text, true))::json ->> 'x-interview-token'))
  ) WITH CHECK (
    (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id))
    OR (access_token IS NOT NULL AND access_token = ((current_setting('request.headers'::text, true))::json ->> 'x-interview-token'))
  );

-- recruitment_evaluations (child via application_id → job)
DROP POLICY IF EXISTS "Users can view evaluations from their account" ON recruitment_evaluations;
DROP POLICY IF EXISTS "Users can create evaluations for their account" ON recruitment_evaluations;
DROP POLICY IF EXISTS "Users can update evaluations from their account" ON recruitment_evaluations;
DROP POLICY IF EXISTS "Users can delete evaluations from their account" ON recruitment_evaluations;

CREATE POLICY "Users can view evaluations from their account" ON recruitment_evaluations
  FOR SELECT USING (EXISTS (SELECT 1 FROM recruitment_applications ra JOIN recruitment_jobs rj ON ra.job_id = rj.id WHERE ra.id = recruitment_evaluations.application_id AND (is_account_member(auth.uid(), rj.account_id) OR can_edit_client_project(auth.uid(), rj.account_id))));
CREATE POLICY "Users can create evaluations for their account" ON recruitment_evaluations
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM recruitment_applications ra JOIN recruitment_jobs rj ON ra.job_id = rj.id WHERE ra.id = recruitment_evaluations.application_id AND (is_account_member(auth.uid(), rj.account_id) OR can_edit_client_project(auth.uid(), rj.account_id))));
CREATE POLICY "Users can update evaluations from their account" ON recruitment_evaluations
  FOR UPDATE USING (EXISTS (SELECT 1 FROM recruitment_applications ra JOIN recruitment_jobs rj ON ra.job_id = rj.id WHERE ra.id = recruitment_evaluations.application_id AND (is_account_member(auth.uid(), rj.account_id) OR can_edit_client_project(auth.uid(), rj.account_id))));
CREATE POLICY "Users can delete evaluations from their account" ON recruitment_evaluations
  FOR DELETE USING (EXISTS (SELECT 1 FROM recruitment_applications ra JOIN recruitment_jobs rj ON ra.job_id = rj.id WHERE ra.id = recruitment_evaluations.application_id AND (is_account_member(auth.uid(), rj.account_id) OR can_edit_client_project(auth.uid(), rj.account_id))));

-- recruitment_evaluation_scores (child via evaluation_id)
DROP POLICY IF EXISTS "Users can view evaluation scores from their account" ON recruitment_evaluation_scores;
DROP POLICY IF EXISTS "Users can create evaluation scores for their account" ON recruitment_evaluation_scores;
DROP POLICY IF EXISTS "Users can update evaluation scores from their account" ON recruitment_evaluation_scores;
DROP POLICY IF EXISTS "Users can delete evaluation scores from their account" ON recruitment_evaluation_scores;

CREATE POLICY "Users can view evaluation scores from their account" ON recruitment_evaluation_scores
  FOR SELECT USING (EXISTS (SELECT 1 FROM recruitment_evaluations re JOIN recruitment_applications ra ON re.application_id = ra.id JOIN recruitment_jobs rj ON ra.job_id = rj.id WHERE re.id = recruitment_evaluation_scores.evaluation_id AND (is_account_member(auth.uid(), rj.account_id) OR can_edit_client_project(auth.uid(), rj.account_id))));
CREATE POLICY "Users can create evaluation scores for their account" ON recruitment_evaluation_scores
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM recruitment_evaluations re JOIN recruitment_applications ra ON re.application_id = ra.id JOIN recruitment_jobs rj ON ra.job_id = rj.id WHERE re.id = recruitment_evaluation_scores.evaluation_id AND (is_account_member(auth.uid(), rj.account_id) OR can_edit_client_project(auth.uid(), rj.account_id))));
CREATE POLICY "Users can update evaluation scores from their account" ON recruitment_evaluation_scores
  FOR UPDATE USING (EXISTS (SELECT 1 FROM recruitment_evaluations re JOIN recruitment_applications ra ON re.application_id = ra.id JOIN recruitment_jobs rj ON ra.job_id = rj.id WHERE re.id = recruitment_evaluation_scores.evaluation_id AND (is_account_member(auth.uid(), rj.account_id) OR can_edit_client_project(auth.uid(), rj.account_id))));
CREATE POLICY "Users can delete evaluation scores from their account" ON recruitment_evaluation_scores
  FOR DELETE USING (EXISTS (SELECT 1 FROM recruitment_evaluations re JOIN recruitment_applications ra ON re.application_id = ra.id JOIN recruitment_jobs rj ON ra.job_id = rj.id WHERE re.id = recruitment_evaluation_scores.evaluation_id AND (is_account_member(auth.uid(), rj.account_id) OR can_edit_client_project(auth.uid(), rj.account_id))));

-- recruitment_disc_profiles (child via job_id)
DROP POLICY IF EXISTS "Users can view disc profiles for jobs they have access to" ON recruitment_disc_profiles;
DROP POLICY IF EXISTS "Users can insert disc profiles for jobs they manage" ON recruitment_disc_profiles;
DROP POLICY IF EXISTS "Users can update disc profiles for jobs they manage" ON recruitment_disc_profiles;
DROP POLICY IF EXISTS "Users can delete disc profiles for jobs they manage" ON recruitment_disc_profiles;

CREATE POLICY "Users can view disc profiles for jobs they have access to" ON recruitment_disc_profiles
  FOR SELECT USING (EXISTS (SELECT 1 FROM recruitment_jobs rj WHERE rj.id = recruitment_disc_profiles.job_id AND (is_account_member(auth.uid(), rj.account_id) OR can_edit_client_project(auth.uid(), rj.account_id))));
CREATE POLICY "Users can insert disc profiles for jobs they manage" ON recruitment_disc_profiles
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM recruitment_jobs rj WHERE rj.id = recruitment_disc_profiles.job_id AND (is_account_member(auth.uid(), rj.account_id) OR can_edit_client_project(auth.uid(), rj.account_id))));
CREATE POLICY "Users can update disc profiles for jobs they manage" ON recruitment_disc_profiles
  FOR UPDATE USING (EXISTS (SELECT 1 FROM recruitment_jobs rj WHERE rj.id = recruitment_disc_profiles.job_id AND (is_account_member(auth.uid(), rj.account_id) OR can_edit_client_project(auth.uid(), rj.account_id))));
CREATE POLICY "Users can delete disc profiles for jobs they manage" ON recruitment_disc_profiles
  FOR DELETE USING (EXISTS (SELECT 1 FROM recruitment_jobs rj WHERE rj.id = recruitment_disc_profiles.job_id AND (is_account_member(auth.uid(), rj.account_id) OR can_edit_client_project(auth.uid(), rj.account_id))));

-- =====================================================
-- GROUP 4: HUNTING
-- =====================================================

-- recruitment_hunting_searches (account_id direto)
DROP POLICY IF EXISTS "Users can view hunting searches for their account" ON recruitment_hunting_searches;
DROP POLICY IF EXISTS "Users can create hunting searches for their account" ON recruitment_hunting_searches;
DROP POLICY IF EXISTS "Users can update hunting searches for their account" ON recruitment_hunting_searches;
DROP POLICY IF EXISTS "Users can delete hunting searches for their account" ON recruitment_hunting_searches;

CREATE POLICY "Users can view hunting searches for their account" ON recruitment_hunting_searches
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can create hunting searches for their account" ON recruitment_hunting_searches
  FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can update hunting searches for their account" ON recruitment_hunting_searches
  FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can delete hunting searches for their account" ON recruitment_hunting_searches
  FOR DELETE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- recruitment_hunting_results (child via search_id)
DROP POLICY IF EXISTS "Users can view hunting results for their account" ON recruitment_hunting_results;
DROP POLICY IF EXISTS "Users can create hunting results for their account" ON recruitment_hunting_results;
DROP POLICY IF EXISTS "Users can update hunting results for their account" ON recruitment_hunting_results;
DROP POLICY IF EXISTS "Users can delete hunting results for their account" ON recruitment_hunting_results;

CREATE POLICY "Users can view hunting results for their account" ON recruitment_hunting_results
  FOR SELECT USING (EXISTS (SELECT 1 FROM recruitment_hunting_searches rhs WHERE rhs.id = recruitment_hunting_results.search_id AND (is_account_member(auth.uid(), rhs.account_id) OR can_edit_client_project(auth.uid(), rhs.account_id))));
CREATE POLICY "Users can create hunting results for their account" ON recruitment_hunting_results
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM recruitment_hunting_searches rhs WHERE rhs.id = recruitment_hunting_results.search_id AND (is_account_member(auth.uid(), rhs.account_id) OR can_edit_client_project(auth.uid(), rhs.account_id))));
CREATE POLICY "Users can update hunting results for their account" ON recruitment_hunting_results
  FOR UPDATE USING (EXISTS (SELECT 1 FROM recruitment_hunting_searches rhs WHERE rhs.id = recruitment_hunting_results.search_id AND (is_account_member(auth.uid(), rhs.account_id) OR can_edit_client_project(auth.uid(), rhs.account_id))));
CREATE POLICY "Users can delete hunting results for their account" ON recruitment_hunting_results
  FOR DELETE USING (EXISTS (SELECT 1 FROM recruitment_hunting_searches rhs WHERE rhs.id = recruitment_hunting_results.search_id AND (is_account_member(auth.uid(), rhs.account_id) OR can_edit_client_project(auth.uid(), rhs.account_id))));

-- recruitment_hunting_approaches (account_id direto)
DROP POLICY IF EXISTS "Account members can view approaches" ON recruitment_hunting_approaches;
DROP POLICY IF EXISTS "Account members can create approaches" ON recruitment_hunting_approaches;
DROP POLICY IF EXISTS "Account members can update approaches" ON recruitment_hunting_approaches;

CREATE POLICY "Account members can view approaches" ON recruitment_hunting_approaches
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Account members can create approaches" ON recruitment_hunting_approaches
  FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Account members can update approaches" ON recruitment_hunting_approaches
  FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- =====================================================
-- GROUP 5: SCORECARDS
-- =====================================================

-- recruitment_scorecard_templates (account_id direto)
DROP POLICY IF EXISTS "Users can view scorecard templates from their account" ON recruitment_scorecard_templates;
DROP POLICY IF EXISTS "Users can create scorecard templates for their account" ON recruitment_scorecard_templates;
DROP POLICY IF EXISTS "Users can update scorecard templates from their account" ON recruitment_scorecard_templates;
DROP POLICY IF EXISTS "Users can delete scorecard templates from their account" ON recruitment_scorecard_templates;

CREATE POLICY "Users can view scorecard templates from their account" ON recruitment_scorecard_templates
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can create scorecard templates for their account" ON recruitment_scorecard_templates
  FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can update scorecard templates from their account" ON recruitment_scorecard_templates
  FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can delete scorecard templates from their account" ON recruitment_scorecard_templates
  FOR DELETE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- recruitment_scorecard_criteria (child via template_id)
DROP POLICY IF EXISTS "Users can view criteria from their templates" ON recruitment_scorecard_criteria;
DROP POLICY IF EXISTS "Users can create criteria for their templates" ON recruitment_scorecard_criteria;
DROP POLICY IF EXISTS "Users can update criteria from their templates" ON recruitment_scorecard_criteria;
DROP POLICY IF EXISTS "Users can delete criteria from their templates" ON recruitment_scorecard_criteria;

CREATE POLICY "Users can view criteria from their templates" ON recruitment_scorecard_criteria
  FOR SELECT USING (EXISTS (SELECT 1 FROM recruitment_scorecard_templates rst WHERE rst.id = recruitment_scorecard_criteria.template_id AND (is_account_member(auth.uid(), rst.account_id) OR can_edit_client_project(auth.uid(), rst.account_id))));
CREATE POLICY "Users can create criteria for their templates" ON recruitment_scorecard_criteria
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM recruitment_scorecard_templates rst WHERE rst.id = recruitment_scorecard_criteria.template_id AND (is_account_member(auth.uid(), rst.account_id) OR can_edit_client_project(auth.uid(), rst.account_id))));
CREATE POLICY "Users can update criteria from their templates" ON recruitment_scorecard_criteria
  FOR UPDATE USING (EXISTS (SELECT 1 FROM recruitment_scorecard_templates rst WHERE rst.id = recruitment_scorecard_criteria.template_id AND (is_account_member(auth.uid(), rst.account_id) OR can_edit_client_project(auth.uid(), rst.account_id))));
CREATE POLICY "Users can delete criteria from their templates" ON recruitment_scorecard_criteria
  FOR DELETE USING (EXISTS (SELECT 1 FROM recruitment_scorecard_templates rst WHERE rst.id = recruitment_scorecard_criteria.template_id AND (is_account_member(auth.uid(), rst.account_id) OR can_edit_client_project(auth.uid(), rst.account_id))));

-- =====================================================
-- GROUP 6: OUTREACH & COMMUNICATION
-- =====================================================

-- recruitment_outreach_campaigns (account_id direto)
DROP POLICY IF EXISTS "Members can view org campaigns" ON recruitment_outreach_campaigns;
DROP POLICY IF EXISTS "Members can create org campaigns" ON recruitment_outreach_campaigns;
DROP POLICY IF EXISTS "Members can update org campaigns" ON recruitment_outreach_campaigns;
DROP POLICY IF EXISTS "Members can delete org campaigns" ON recruitment_outreach_campaigns;

CREATE POLICY "Members can view org campaigns" ON recruitment_outreach_campaigns
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Members can create org campaigns" ON recruitment_outreach_campaigns
  FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Members can update org campaigns" ON recruitment_outreach_campaigns
  FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Members can delete org campaigns" ON recruitment_outreach_campaigns
  FOR DELETE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- recruitment_outreach_conversations (account_id direto)
DROP POLICY IF EXISTS "Members can manage org conversations" ON recruitment_outreach_conversations;
DROP POLICY IF EXISTS "Members can view org conversations" ON recruitment_outreach_conversations;

CREATE POLICY "Members can manage org conversations" ON recruitment_outreach_conversations
  FOR ALL USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id))
  WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- recruitment_outreach_queue (account_id direto)
DROP POLICY IF EXISTS "Members can manage org queue" ON recruitment_outreach_queue;
DROP POLICY IF EXISTS "Members can view org queue" ON recruitment_outreach_queue;

CREATE POLICY "Members can manage org queue" ON recruitment_outreach_queue
  FOR ALL USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id))
  WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- recruitment_message_templates (account_id direto)
DROP POLICY IF EXISTS "Account members can view recruitment message templates" ON recruitment_message_templates;
DROP POLICY IF EXISTS "Account members can insert recruitment message templates" ON recruitment_message_templates;
DROP POLICY IF EXISTS "Account members can update recruitment message templates" ON recruitment_message_templates;
DROP POLICY IF EXISTS "Account members can delete recruitment message templates" ON recruitment_message_templates;

CREATE POLICY "Account members can view recruitment message templates" ON recruitment_message_templates
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Account members can insert recruitment message templates" ON recruitment_message_templates
  FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Account members can update recruitment message templates" ON recruitment_message_templates
  FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Account members can delete recruitment message templates" ON recruitment_message_templates
  FOR DELETE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- recruitment_communications_log (account_id direto)
DROP POLICY IF EXISTS "Members can view recruitment communications logs" ON recruitment_communications_log;
DROP POLICY IF EXISTS "Members can insert recruitment communications logs" ON recruitment_communications_log;

CREATE POLICY "Members can view recruitment communications logs" ON recruitment_communications_log
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Members can insert recruitment communications logs" ON recruitment_communications_log
  FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- recruitment_communication_alerts (account_id direto)
DROP POLICY IF EXISTS "Admins can view recruitment communication alerts" ON recruitment_communication_alerts;
DROP POLICY IF EXISTS "Admins can resolve recruitment communication alerts" ON recruitment_communication_alerts;

CREATE POLICY "Admins can view recruitment communication alerts" ON recruitment_communication_alerts
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Admins can resolve recruitment communication alerts" ON recruitment_communication_alerts
  FOR UPDATE USING (is_account_admin_or_owner(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id))
  WITH CHECK (is_account_admin_or_owner(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- recruitment_email_log (account_id direto)
DROP POLICY IF EXISTS "Users can view own account email logs" ON recruitment_email_log;
DROP POLICY IF EXISTS "Users can insert email logs for own account" ON recruitment_email_log;

CREATE POLICY "Users can view own account email logs" ON recruitment_email_log
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can insert email logs for own account" ON recruitment_email_log
  FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- =====================================================
-- GROUP 7: CONFIGS & METRICS
-- =====================================================

-- recruitment_goals (account_id direto)
DROP POLICY IF EXISTS "Users can view goals for their account" ON recruitment_goals;
DROP POLICY IF EXISTS "Users can insert goals for their account" ON recruitment_goals;
DROP POLICY IF EXISTS "Users can update goals for their account" ON recruitment_goals;
DROP POLICY IF EXISTS "Users can delete goals for their account" ON recruitment_goals;

CREATE POLICY "Users can view goals for their account" ON recruitment_goals
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can insert goals for their account" ON recruitment_goals
  FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can update goals for their account" ON recruitment_goals
  FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can delete goals for their account" ON recruitment_goals
  FOR DELETE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- recruitment_job_workflow_config (account_id direto)
DROP POLICY IF EXISTS "Account members can manage workflow config" ON recruitment_job_workflow_config;

CREATE POLICY "Account members can manage workflow config" ON recruitment_job_workflow_config
  FOR ALL USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id))
  WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- recruitment_scheduled_notifications (account_id direto)
DROP POLICY IF EXISTS "Account members can view scheduled notifications" ON recruitment_scheduled_notifications;
DROP POLICY IF EXISTS "Account members can insert scheduled notifications" ON recruitment_scheduled_notifications;
DROP POLICY IF EXISTS "Account members can update scheduled notifications" ON recruitment_scheduled_notifications;

CREATE POLICY "Account members can view scheduled notifications" ON recruitment_scheduled_notifications
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Account members can insert scheduled notifications" ON recruitment_scheduled_notifications
  FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Account members can update scheduled notifications" ON recruitment_scheduled_notifications
  FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- recruitment_notification_settings (account_id direto)
DROP POLICY IF EXISTS "Admins and owners can manage notification settings" ON recruitment_notification_settings;
DROP POLICY IF EXISTS "Users can view their account notification settings" ON recruitment_notification_settings;

CREATE POLICY "Admins and owners can manage notification settings" ON recruitment_notification_settings
  FOR ALL USING (is_account_admin_or_owner(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id))
  WITH CHECK (is_account_admin_or_owner(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can view their account notification settings" ON recruitment_notification_settings
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- recruitment_proposals (account_id direto)
DROP POLICY IF EXISTS "Users can view proposals from their organization" ON recruitment_proposals;
DROP POLICY IF EXISTS "Users can insert proposals for their organization" ON recruitment_proposals;
DROP POLICY IF EXISTS "Users can update proposals in their organization" ON recruitment_proposals;
DROP POLICY IF EXISTS "Users can delete proposals from their organization" ON recruitment_proposals;

CREATE POLICY "Users can view proposals from their organization" ON recruitment_proposals
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can insert proposals for their organization" ON recruitment_proposals
  FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can update proposals in their organization" ON recruitment_proposals
  FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can delete proposals from their organization" ON recruitment_proposals
  FOR DELETE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- recruitment_proposal_templates (account_id direto)
DROP POLICY IF EXISTS "Users can view proposal templates from their organization" ON recruitment_proposal_templates;
DROP POLICY IF EXISTS "Users can insert proposal templates for their organization" ON recruitment_proposal_templates;
DROP POLICY IF EXISTS "Users can update proposal templates in their organization" ON recruitment_proposal_templates;
DROP POLICY IF EXISTS "Users can delete proposal templates from their organization" ON recruitment_proposal_templates;

CREATE POLICY "Users can view proposal templates from their organization" ON recruitment_proposal_templates
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can insert proposal templates for their organization" ON recruitment_proposal_templates
  FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can update proposal templates in their organization" ON recruitment_proposal_templates
  FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can delete proposal templates from their organization" ON recruitment_proposal_templates
  FOR DELETE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- recruitment_headcount_plan (account_id direto)
DROP POLICY IF EXISTS "Account members can read recruitment headcount plan" ON recruitment_headcount_plan;
DROP POLICY IF EXISTS "Account admins can insert recruitment headcount plan" ON recruitment_headcount_plan;
DROP POLICY IF EXISTS "Account admins can update recruitment headcount plan" ON recruitment_headcount_plan;
DROP POLICY IF EXISTS "Account admins can delete recruitment headcount plan" ON recruitment_headcount_plan;

CREATE POLICY "Account members can read recruitment headcount plan" ON recruitment_headcount_plan
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Account admins can insert recruitment headcount plan" ON recruitment_headcount_plan
  FOR INSERT TO authenticated WITH CHECK (is_account_admin_or_owner(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Account admins can update recruitment headcount plan" ON recruitment_headcount_plan
  FOR UPDATE TO authenticated USING (is_account_admin_or_owner(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id))
  WITH CHECK (is_account_admin_or_owner(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Account admins can delete recruitment headcount plan" ON recruitment_headcount_plan
  FOR DELETE TO authenticated USING (is_account_admin_or_owner(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- recruitment_source_spend (account_id direto)
DROP POLICY IF EXISTS "Account members can read recruitment source spend" ON recruitment_source_spend;
DROP POLICY IF EXISTS "Account admins can insert recruitment source spend" ON recruitment_source_spend;
DROP POLICY IF EXISTS "Account admins can update recruitment source spend" ON recruitment_source_spend;
DROP POLICY IF EXISTS "Account admins can delete recruitment source spend" ON recruitment_source_spend;

CREATE POLICY "Account members can read recruitment source spend" ON recruitment_source_spend
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Account admins can insert recruitment source spend" ON recruitment_source_spend
  FOR INSERT TO authenticated WITH CHECK (is_account_admin_or_owner(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Account admins can update recruitment source spend" ON recruitment_source_spend
  FOR UPDATE TO authenticated USING (is_account_admin_or_owner(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id))
  WITH CHECK (is_account_admin_or_owner(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Account admins can delete recruitment source spend" ON recruitment_source_spend
  FOR DELETE TO authenticated USING (is_account_admin_or_owner(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- recruitment_metric_alerts (account_id direto)
DROP POLICY IF EXISTS "Users can view their org alerts" ON recruitment_metric_alerts;
DROP POLICY IF EXISTS "Users can insert their org alerts" ON recruitment_metric_alerts;
DROP POLICY IF EXISTS "Users can update their org alerts" ON recruitment_metric_alerts;

CREATE POLICY "Users can view their org alerts" ON recruitment_metric_alerts
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can insert their org alerts" ON recruitment_metric_alerts
  FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can update their org alerts" ON recruitment_metric_alerts
  FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));

-- recruitment_metric_thresholds (account_id direto)
DROP POLICY IF EXISTS "Users can view their org thresholds" ON recruitment_metric_thresholds;
DROP POLICY IF EXISTS "Users can insert their org thresholds" ON recruitment_metric_thresholds;
DROP POLICY IF EXISTS "Users can update their org thresholds" ON recruitment_metric_thresholds;

CREATE POLICY "Users can view their org thresholds" ON recruitment_metric_thresholds
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can insert their org thresholds" ON recruitment_metric_thresholds
  FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
CREATE POLICY "Users can update their org thresholds" ON recruitment_metric_thresholds
  FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id));
