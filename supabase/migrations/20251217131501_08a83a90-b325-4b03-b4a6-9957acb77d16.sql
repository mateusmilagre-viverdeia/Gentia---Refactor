-- Primeira migração: Adicionar novos roles ao enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'head_cs';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ep_consultant';