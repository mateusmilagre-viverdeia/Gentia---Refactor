-- ============================================================================
-- PERFORMANCE — remove constraint UNIQUE duplicada (complemento de 200000)
-- ----------------------------------------------------------------------------
-- candidate_disc_responses tinha DUAS constraints UNIQUE idênticas em
-- (session_id, question_id): a auto-gerada `_session_id_question_id_key` e a
-- manual `_session_question_unique`. Mantemos a auto-gerada; removemos a manual.
-- Confirmado: nenhuma é alvo de FK. Advisor duplicate_index: 1 -> 0.
-- ============================================================================

alter table public.candidate_disc_responses
  drop constraint if exists candidate_disc_responses_session_question_unique;
