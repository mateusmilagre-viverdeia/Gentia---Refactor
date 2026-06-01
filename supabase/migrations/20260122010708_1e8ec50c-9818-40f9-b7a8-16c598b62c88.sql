-- =====================================================
-- CORREÇÃO EM MASSA DE INCONSISTÊNCIAS PROFILES/MEMBERS
-- =====================================================

-- 1. Corrigir Categoria 2: 16 usuários com account_id NULL mas com memberships
-- Atualiza profiles.account_id usando a membership mais antiga
UPDATE profiles p
SET account_id = (
  SELECT am.account_id 
  FROM account_members am 
  WHERE am.user_id = p.id 
    AND am.is_active = true
  ORDER BY am.created_at ASC 
  LIMIT 1
)
WHERE p.account_id IS NULL
AND EXISTS (
  SELECT 1 FROM account_members am 
  WHERE am.user_id = p.id 
    AND am.is_active = true
);

-- 2. Corrigir Categoria 1: Criar memberships para usuários com account_id mas sem membership
-- Apenas se a company existir e o usuário não tiver membership para essa org
INSERT INTO account_members (account_id, user_id, role, is_active)
SELECT p.account_id, p.id, 'member'::account_role, true
FROM profiles p
WHERE p.account_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM account_members am 
  WHERE am.user_id = p.id 
    AND am.account_id = p.account_id
)
AND EXISTS (
  SELECT 1 FROM companies c 
  WHERE c.id = p.account_id
)
ON CONFLICT DO NOTHING;

-- 3. Criar função de sincronização para prevenção futura
CREATE OR REPLACE FUNCTION public.sync_profile_account_on_member_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas atualiza profiles.account_id se estiver NULL
  -- Isso garante que o primeiro membership define o account_id
  -- e criações subsequentes não sobrescrevem
  UPDATE profiles
  SET account_id = NEW.account_id,
      updated_at = now()
  WHERE id = NEW.user_id
    AND account_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS trigger_sync_profile_account ON account_members;
CREATE TRIGGER trigger_sync_profile_account
  AFTER INSERT ON account_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_account_on_member_insert();