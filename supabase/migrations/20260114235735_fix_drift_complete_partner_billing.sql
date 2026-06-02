-- ============================================================================
-- FIX DE SCHEMA DRIFT (consolidado) — gerado de types.ts (estado real da origem)
-- 11 tabelas que existem no banco real mas nenhuma migration cria.
-- CREATE TABLE IF NOT EXISTS + ALTER ADD COLUMN IF NOT EXISTS = idempotente
-- (cobre tanto criação do zero quanto tabelas já criadas parcialmente nos fixes).
-- Tipos inferidos de types.ts; defaults/FKs finos a refinar na fase de dados.
-- ============================================================================

create table if not exists public.ep_partners (
  active boolean,
  company_name text,
  cpf_cnpj text,
  created_at timestamptz default now(),
  created_by uuid not null,
  email text not null,
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  own_project_grant_id uuid,
  phone text,
  promo_code text not null,
  user_id uuid not null
);
alter table public.ep_partners add column if not exists active boolean;
alter table public.ep_partners add column if not exists company_name text;
alter table public.ep_partners add column if not exists cpf_cnpj text;
alter table public.ep_partners add column if not exists created_at timestamptz;
alter table public.ep_partners add column if not exists created_by uuid;
alter table public.ep_partners add column if not exists email text;
alter table public.ep_partners add column if not exists name text;
alter table public.ep_partners add column if not exists notes text;
alter table public.ep_partners add column if not exists own_project_grant_id uuid;
alter table public.ep_partners add column if not exists phone text;
alter table public.ep_partners add column if not exists promo_code text;
alter table public.ep_partners add column if not exists user_id uuid;
alter table public.ep_partners enable row level security;

create table if not exists public.partner_client_grants (
  expires_at timestamptz not null,
  granted_at timestamptz,
  granted_by uuid not null,
  id uuid primary key default gen_random_uuid(),
  notes text,
  org_id uuid,
  partner_id uuid not null,
  promo_code_used text,
  revoked_at timestamptz,
  revoked_by uuid,
  user_id uuid
);
alter table public.partner_client_grants add column if not exists expires_at timestamptz;
alter table public.partner_client_grants add column if not exists granted_at timestamptz;
alter table public.partner_client_grants add column if not exists granted_by uuid;
alter table public.partner_client_grants add column if not exists notes text;
alter table public.partner_client_grants add column if not exists org_id uuid;
alter table public.partner_client_grants add column if not exists partner_id uuid;
alter table public.partner_client_grants add column if not exists promo_code_used text;
alter table public.partner_client_grants add column if not exists revoked_at timestamptz;
alter table public.partner_client_grants add column if not exists revoked_by uuid;
alter table public.partner_client_grants add column if not exists user_id uuid;
alter table public.partner_client_grants enable row level security;

create table if not exists public.partner_licenses (
  active boolean,
  created_at timestamptz default now(),
  created_by uuid not null,
  id uuid primary key default gen_random_uuid(),
  notes text,
  partner_id uuid not null,
  total_seats numeric not null,
  valid_from text,
  valid_until text
);
alter table public.partner_licenses add column if not exists active boolean;
alter table public.partner_licenses add column if not exists created_at timestamptz;
alter table public.partner_licenses add column if not exists created_by uuid;
alter table public.partner_licenses add column if not exists notes text;
alter table public.partner_licenses add column if not exists partner_id uuid;
alter table public.partner_licenses add column if not exists total_seats numeric;
alter table public.partner_licenses add column if not exists valid_from text;
alter table public.partner_licenses add column if not exists valid_until text;
alter table public.partner_licenses enable row level security;

create table if not exists public.partner_royalties (
  additional_seats numeric not null,
  base_plan_amount numeric not null,
  created_at timestamptz default now(),
  grant_id uuid not null,
  id uuid primary key default gen_random_uuid(),
  invoiced_at timestamptz,
  org_id uuid,
  paid_at timestamptz,
  partner_id uuid not null,
  period_end text not null,
  period_start text not null,
  royalty_amount numeric not null,
  royalty_percentage numeric not null,
  seat_amount numeric not null,
  status text,
  total_client_amount numeric not null
);
alter table public.partner_royalties add column if not exists additional_seats numeric;
alter table public.partner_royalties add column if not exists base_plan_amount numeric;
alter table public.partner_royalties add column if not exists created_at timestamptz;
alter table public.partner_royalties add column if not exists grant_id uuid;
alter table public.partner_royalties add column if not exists invoiced_at timestamptz;
alter table public.partner_royalties add column if not exists org_id uuid;
alter table public.partner_royalties add column if not exists paid_at timestamptz;
alter table public.partner_royalties add column if not exists partner_id uuid;
alter table public.partner_royalties add column if not exists period_end text;
alter table public.partner_royalties add column if not exists period_start text;
alter table public.partner_royalties add column if not exists royalty_amount numeric;
alter table public.partner_royalties add column if not exists royalty_percentage numeric;
alter table public.partner_royalties add column if not exists seat_amount numeric;
alter table public.partner_royalties add column if not exists status text;
alter table public.partner_royalties add column if not exists total_client_amount numeric;
alter table public.partner_royalties enable row level security;

create table if not exists public.platform_seat_pricing (
  created_at timestamptz default now(),
  id uuid primary key default gen_random_uuid(),
  plan_id uuid,
  price_cents numeric not null,
  stripe_price_id uuid
);
alter table public.platform_seat_pricing add column if not exists created_at timestamptz;
alter table public.platform_seat_pricing add column if not exists plan_id uuid;
alter table public.platform_seat_pricing add column if not exists price_cents numeric;
alter table public.platform_seat_pricing add column if not exists stripe_price_id uuid;
alter table public.platform_seat_pricing enable row level security;

create table if not exists public.platform_subscription_plans (
  created_at timestamptz default now(),
  description text,
  id uuid primary key default gen_random_uuid(),
  included_credits jsonb,
  included_seats numeric not null,
  is_active boolean,
  is_default boolean,
  name text not null,
  price_cents numeric not null,
  sort_order numeric,
  stripe_price_id uuid,
  stripe_product_id uuid,
  trial_days numeric,
  updated_at timestamptz
);
alter table public.platform_subscription_plans add column if not exists created_at timestamptz;
alter table public.platform_subscription_plans add column if not exists description text;
alter table public.platform_subscription_plans add column if not exists included_credits jsonb;
alter table public.platform_subscription_plans add column if not exists included_seats numeric;
alter table public.platform_subscription_plans add column if not exists is_active boolean;
alter table public.platform_subscription_plans add column if not exists is_default boolean;
alter table public.platform_subscription_plans add column if not exists name text;
alter table public.platform_subscription_plans add column if not exists price_cents numeric;
alter table public.platform_subscription_plans add column if not exists sort_order numeric;
alter table public.platform_subscription_plans add column if not exists stripe_price_id uuid;
alter table public.platform_subscription_plans add column if not exists stripe_product_id uuid;
alter table public.platform_subscription_plans add column if not exists trial_days numeric;
alter table public.platform_subscription_plans add column if not exists updated_at timestamptz;
alter table public.platform_subscription_plans enable row level security;

create table if not exists public.promo_code_redemptions (
  grant_id uuid,
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  partner_id uuid not null,
  promo_code text not null,
  redeemed_at timestamptz,
  user_id uuid not null
);
alter table public.promo_code_redemptions add column if not exists grant_id uuid;
alter table public.promo_code_redemptions add column if not exists org_id uuid;
alter table public.promo_code_redemptions add column if not exists partner_id uuid;
alter table public.promo_code_redemptions add column if not exists promo_code text;
alter table public.promo_code_redemptions add column if not exists redeemed_at timestamptz;
alter table public.promo_code_redemptions add column if not exists user_id uuid;
alter table public.promo_code_redemptions enable row level security;

create table if not exists public.recruitment_headcount_plan (
  account_id uuid not null,
  created_at timestamptz default now(),
  id uuid primary key default gen_random_uuid(),
  month numeric not null,
  notes text,
  planned_hires numeric not null,
  updated_at timestamptz not null,
  year numeric not null
);
alter table public.recruitment_headcount_plan add column if not exists account_id uuid;
alter table public.recruitment_headcount_plan add column if not exists created_at timestamptz;
alter table public.recruitment_headcount_plan add column if not exists month numeric;
alter table public.recruitment_headcount_plan add column if not exists notes text;
alter table public.recruitment_headcount_plan add column if not exists planned_hires numeric;
alter table public.recruitment_headcount_plan add column if not exists updated_at timestamptz;
alter table public.recruitment_headcount_plan add column if not exists year numeric;
alter table public.recruitment_headcount_plan enable row level security;

create table if not exists public.recruitment_package_features (
  created_at timestamptz default now(),
  feature_key text not null,
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null
);
alter table public.recruitment_package_features add column if not exists created_at timestamptz;
alter table public.recruitment_package_features add column if not exists feature_key text;
alter table public.recruitment_package_features add column if not exists package_id uuid;
alter table public.recruitment_package_features enable row level security;

create table if not exists public.recruitment_source_spend (
  account_id uuid not null,
  amount numeric not null,
  created_at timestamptz default now(),
  id uuid primary key default gen_random_uuid(),
  month numeric not null,
  notes text,
  source text not null,
  updated_at timestamptz not null,
  year numeric not null
);
alter table public.recruitment_source_spend add column if not exists account_id uuid;
alter table public.recruitment_source_spend add column if not exists amount numeric;
alter table public.recruitment_source_spend add column if not exists created_at timestamptz;
alter table public.recruitment_source_spend add column if not exists month numeric;
alter table public.recruitment_source_spend add column if not exists notes text;
alter table public.recruitment_source_spend add column if not exists source text;
alter table public.recruitment_source_spend add column if not exists updated_at timestamptz;
alter table public.recruitment_source_spend add column if not exists year numeric;
alter table public.recruitment_source_spend enable row level security;

create table if not exists public.whatsapp_message_logs (
  created_at timestamptz default now(),
  direction text not null,
  error_code text,
  error_message text,
  id uuid primary key default gen_random_uuid(),
  meta_payload jsonb,
  sent_by uuid,
  status text not null,
  template_language text,
  template_name text,
  to_phone text not null,
  updated_at timestamptz not null,
  wamid text
);
alter table public.whatsapp_message_logs add column if not exists created_at timestamptz;
alter table public.whatsapp_message_logs add column if not exists direction text;
alter table public.whatsapp_message_logs add column if not exists error_code text;
alter table public.whatsapp_message_logs add column if not exists error_message text;
alter table public.whatsapp_message_logs add column if not exists meta_payload jsonb;
alter table public.whatsapp_message_logs add column if not exists sent_by uuid;
alter table public.whatsapp_message_logs add column if not exists status text;
alter table public.whatsapp_message_logs add column if not exists template_language text;
alter table public.whatsapp_message_logs add column if not exists template_name text;
alter table public.whatsapp_message_logs add column if not exists to_phone text;
alter table public.whatsapp_message_logs add column if not exists updated_at timestamptz;
alter table public.whatsapp_message_logs add column if not exists wamid text;
alter table public.whatsapp_message_logs enable row level security;


