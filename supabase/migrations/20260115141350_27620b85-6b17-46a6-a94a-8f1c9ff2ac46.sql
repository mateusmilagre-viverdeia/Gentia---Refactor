-- 1. Adicionar coluna account_id na tabela roip_assessments
ALTER TABLE roip_assessments 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES companies(id);

-- 2. Popular a coluna baseado nos membros existentes
UPDATE roip_assessments ra
SET account_id = (
  SELECT am.account_id 
  FROM account_members am 
  WHERE am.user_id = ra.user_id 
  LIMIT 1
)
WHERE ra.account_id IS NULL;

-- 3. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_roip_assessments_account_id ON roip_assessments(account_id);

-- 4. Atualizar RLS policies para incluir can_edit_client_project
DROP POLICY IF EXISTS "Users can view own roip assessments" ON roip_assessments;
DROP POLICY IF EXISTS "Users can create own roip assessments" ON roip_assessments;
DROP POLICY IF EXISTS "Users can update own roip assessments" ON roip_assessments;

CREATE POLICY "Members can view roip assessments" ON roip_assessments 
FOR SELECT USING (
  auth.uid() = user_id
  OR is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

CREATE POLICY "Members can create roip assessments" ON roip_assessments 
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND (
    account_id IS NULL 
    OR is_account_member(auth.uid(), account_id)
  )
);

CREATE POLICY "Members can update roip assessments" ON roip_assessments 
FOR UPDATE USING (
  auth.uid() = user_id
  OR is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

CREATE POLICY "Members can delete roip assessments" ON roip_assessments 
FOR DELETE USING (
  auth.uid() = user_id
  OR is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);