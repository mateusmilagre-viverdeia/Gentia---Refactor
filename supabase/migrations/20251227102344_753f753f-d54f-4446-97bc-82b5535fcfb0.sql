-- Fase 0: Adicionar novos valores ao enum account_role
-- Hierarquia: owner (6) → admin (5) → admin_rh (4) → leader (3) → member (2) → viewer (1)

ALTER TYPE public.account_role ADD VALUE IF NOT EXISTS 'admin_rh' AFTER 'admin';
ALTER TYPE public.account_role ADD VALUE IF NOT EXISTS 'leader' AFTER 'admin_rh';