-- Hardening (Frente A / advisor WARN anon+authenticated_security_definer): remove o EXECUTE
-- herdado via grant default PUBLIC em funções SECURITY DEFINER que NÃO precisam dele, SEM
-- quebrar nada. (Revogar só de 'anon' era no-op: o acesso vinha de PUBLIC.)
--
-- Verificado por TESTE ATÔMICO (rollback total): trigger dispara mesmo SEM execute de PUBLIC
-- (o trigger roda pelo mecanismo do Postgres, como dono — não exige privilégio do chamador).
--
-- Classificação (das 71 definer executáveis por anon):
--   • 32 TRIGGER functions      -> revoke PUBLIC/anon/authenticated (postgres+service_role mantêm).
--   • get_auth_email, user_has_role_in_account (usadas em policies AUTHENTICATED) -> revoke
--     PUBLIC/anon + GRANT authenticated (garante que a RLS authenticated continua).
--   • generate_outreach_reply_token (só chamada por send-outreach-email via service_role)
--     -> revoke PUBLIC/anon/authenticated + GRANT service_role.
--   • MANTIDAS (não tocadas): 23 helpers de RLS anon-facing (is_*/can_*/has_role/is_consultant_for_account/
--     is_head_cs/...) usados em policies role={public}; e 14 RPCs públicos por token (get_*_by_token,
--     increment_career_*, submit_nps_response, ...) chamados via rpc() em páginas públicas.
-- Reversível: re-GRANT EXECUTE ... TO PUBLIC.

do $$
declare r record;
begin
  -- (1) Trigger functions: ninguém precisa de execute (disparam como dono). Filtro prorettype='trigger' = trava.
  for r in
    select p.oid::regprocedure sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and p.prorettype = 'trigger'::regtype
      and p.proname = any (array[
        'add_to_shared_talent_pool','ai_billing_fuse_trigger','auto_populate_process_history',
        'auto_set_published_at','enforce_module_version_retention','ensure_org_billing_trial',
        'ensure_single_default_roip','handle_marketplace_opt_out','handle_new_user',
        'invalidate_cv_match_cache_on_job_update','log_recruitment_application_changes',
        'notify_candidate_pool_entry','notify_consultant_on_action','notify_consultant_on_checkpoint',
        'notify_high_score_hunting_result','notify_low_satisfaction_score','on_company_created_intake',
        'resolve_candidate_id_from_profile','set_company_cnpj_digits','set_updated_at_pre_client_grants',
        'sync_marketplace_optout','sync_profile_account_on_member_insert',
        'sync_subscription_credits_on_package_update','sync_user_to_org_chart','touch_hunting_contact_cache',
        'trigger_cross_match_on_job_created','trigger_cross_match_on_rejection','trigger_regenerate_indeed_feed',
        'update_profiles_updated_at','update_talent_pool_view_count','update_values_sessions_updated_at',
        'validate_consultant_availability_block'
      ])
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;

  -- (2) Helpers usados em policies authenticated: tira PUBLIC/anon, garante authenticated.
  for r in
    select p.oid::regprocedure sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and p.proname = any (array['get_auth_email','user_has_role_in_account'])
  loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;

  -- (3) Gerador de token chamado só via service_role: tira PUBLIC/anon/authenticated, garante service_role.
  for r in
    select p.oid::regprocedure sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and p.proname = 'generate_outreach_reply_token'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;
