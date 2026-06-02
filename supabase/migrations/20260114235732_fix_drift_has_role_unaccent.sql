-- ============================================================================
-- FIX DE SCHEMA DRIFT (parte 2) — migração Lovable Cloud -> Supabase dedicado
-- ----------------------------------------------------------------------------
-- Dois objetos usados pelas migrations mas NUNCA criados por nenhuma delas
-- (criados direto na origem, fora do controle de migrations):
--
--   1) public.has_role(uuid, app_role)  — função RBAC central, usada em 48+
--      policies (primeiro uso na migration 20260114235736). Definição padrão
--      Supabase RBAC sobre public.user_roles(user_id, role).
--
--   2) extensão `unaccent` — usada em buscas textuais (primeiro uso em
--      20260420120916, chamada como public.unaccent(...)). Criada no schema
--      public para casar com as chamadas qualificadas do código.
--
-- Inserido pelo time de refactor (Gentia) em 2026-06-01.
-- ============================================================================

create extension if not exists unaccent with schema public;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;
