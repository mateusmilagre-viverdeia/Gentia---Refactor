-- Hardening de segurança: remove policies de INSERT PERMISSIVAS (WITH CHECK true)
-- expostas a anon/public. Todas as escritas legítimas nessas tabelas são feitas
-- por EDGE FUNCTIONS via service_role (que ignora RLS) — confirmado: 0 inserts no
-- front (src/) e os inserts nas functions usam SERVICE_ROLE_KEY:
--   candidate_external_entries  -> whatsapp-intake, process-external-entry, email-intake
--   recruitment_decision_log    -> recruitment-orchestrator
--   recruitment_screening_results -> screening-evaluate, recruitment-orchestrator, compare-finalists
--   talent_pool_views           -> talent-pool-analytics
--   portal_feedbacks            -> portal-data (submit_feedback)
-- Remover as policies elimina o vetor de ESCRITA ANÔNIMA (poluição/integridade)
-- sem quebrar nenhum fluxo (service_role continua inserindo normalmente).

drop policy if exists "Service role can insert external entries" on public.candidate_external_entries;
drop policy if exists "Service role can insert decision logs"     on public.recruitment_decision_log;
drop policy if exists "Anyone can insert screening results"        on public.recruitment_screening_results;
drop policy if exists "Service role can insert views"              on public.talent_pool_views;

-- portal_feedbacks: 3 policies anônimas redundantes (inserção agora é via portal-data).
drop policy if exists "Anyone can submit feedback via report" on public.portal_feedbacks;
drop policy if exists "Portal can submit feedbacks"           on public.portal_feedbacks;
drop policy if exists "anon_portal_feedback_insert"           on public.portal_feedbacks;
