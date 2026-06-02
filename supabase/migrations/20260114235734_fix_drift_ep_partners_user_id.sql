-- ============================================================================
-- FIX DE SCHEMA DRIFT (parte 3) — migração Lovable Cloud -> Supabase dedicado
-- ----------------------------------------------------------------------------
-- A tabela public.ep_partners (criada na origem fora de migration) tem colunas
-- usadas pelas policies que não constam de nenhuma migration. As migrations
-- referenciam apenas `ep_partners.user_id` (6 policies do tipo
-- "partner vê seus próprios registros" → user_id = auth.uid()).
-- Adicionamos essa coluna. A estrutura COMPLETA de ep_partners /
-- partner_client_grants será reconciliada na fase de migração de dados.
-- ============================================================================

alter table public.ep_partners add column if not exists user_id uuid;
