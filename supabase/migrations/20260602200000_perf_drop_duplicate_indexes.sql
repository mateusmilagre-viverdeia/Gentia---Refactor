-- ============================================================================
-- PERFORMANCE — remove 45 índices redundantes (Frente C). Advisor: duplicate_index
-- ----------------------------------------------------------------------------
-- Índices com colunas+predicado idênticos a outro na mesma tabela (desperdício
-- de escrita e espaço). Mantém-se sempre o índice de constraint (UNIQUE/PK) ou
-- o canônico; nunca se remove índice de constraint nem índices PARCIAIS de
-- predicado distinto (ex.: is_test=true vs false — complementares, preservados).
-- ============================================================================

drop index if exists public.idx_account_demo_config_account_id;
drop index if exists public.idx_account_health_scores_account_id;
drop index if exists public.idx_account_licensed_modules_lookup;
drop index if exists public.idx_ai_exec_logs_account_created;
drop index if exists public.idx_ai_exec_logs_function_created;
drop index if exists public.idx_billing_invoices_stripe_invoice_id;
drop index if exists public.idx_cv_intel_candidate;
drop index if exists public.idx_cv_match_candidate_job;
drop index if exists public.idx_candidate_disc_results_session;
drop index if exists public.idx_candidate_disc_sessions_token;
drop index if exists public.idx_candidate_marketplace_prefs_email;
drop index if exists public.idx_candidate_nps_token;
drop index if exists public.idx_client_career_pages_slug;
drop index if exists public.idx_commercial_proposals_token;
drop index if exists public.idx_companies_slug;
drop index if exists public.idx_company_gamification_stats_account;
drop index if exists public.idx_company_holidays_account_date;
drop index if exists public.idx_culture_code_shares_token;
drop index if exists public.idx_culture_interview_sessions_token;
drop index if exists public.idx_disc_results_session;
drop index if exists public.idx_email_intake_email;
drop index if exists public.idx_unsubscribe_tokens_token;
drop index if exists public.hunting_daily_usage_lookup_idx;
drop index if exists public.idx_indeed_feed_config_slug;
drop index if exists public.idx_job_benchmark_cache_lookup;
drop index if exists public.idx_recurrence_next_occurrence;
drop index if exists public.idx_offboarding_survey_tokens_token;
drop index if exists public.idx_onboarding_evaluations_process;
drop index if exists public.idx_org_seat_grants_org_id;
drop index if exists public.idx_portal_acesso_token;
drop index if exists public.idx_process_roi_reports_public_token;
drop index if exists public.project_alerts_account_dedupe_key_uidx;
drop index if exists public.idx_project_health_scores_account;
drop index if exists public.idx_project_playbook_apps_account;
drop index if exists public.idx_pulse_daily_assignments_date;
drop index if exists public.idx_pulse_metrics_daily_date;
drop index if exists public.idx_qa_results_session;
drop index if exists public.idx_rcce_account_candidate_job;
drop index if exists public.idx_rccp_account_candidate;
drop index if exists public.idx_evaluations_evaluator_id;
drop index if exists public.idx_recruitment_interviews_access_token;
drop index if exists public.idx_shortlist_relatorios_token;
drop index if exists public.idx_suppressed_emails_email;
drop index if exists public.idx_technical_interview_sessions_token;
drop index if exists public.idx_user_badges_unique_award;
