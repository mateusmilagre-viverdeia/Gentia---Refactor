-- ============================================================================
-- FIX DE SCHEMA DRIFT (migração Lovable Cloud -> Supabase dedicado)
-- ----------------------------------------------------------------------------
-- As tabelas public.ep_partners e public.partner_client_grants foram criadas
-- DIRETAMENTE no banco da ORIGEM (Lovable Cloud), sem migration correspondente
-- no repositório. As migrations seguintes apenas referenciam a coluna `id`
-- (chaves estrangeiras), nunca criam nem alteram essas tabelas.
--
-- Criamos aqui a estrutura MÍNIMA necessária para destravar o replay das
-- migrations. A estrutura completa (demais colunas) será reconciliada na
-- fase de migração de dados, a partir do estado real da origem.
-- Inserido pelo time de refactor (Gentia) em 2026-06-01.
-- ============================================================================

create table if not exists public.ep_partners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.partner_client_grants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- RLS habilitado por padrão (sem policies → acesso só via service_role até
-- reconciliarmos as policies reais). Mantém o linter de segurança satisfeito.
alter table public.ep_partners enable row level security;
alter table public.partner_client_grants enable row level security;
