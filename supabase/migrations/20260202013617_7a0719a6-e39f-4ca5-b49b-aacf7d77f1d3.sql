
-- =====================================================
-- FIX: Adicionar políticas RLS para INSERT e UPDATE 
-- para membros da empresa em culture_interview_sessions
-- =====================================================

-- 1. Policy para INSERT: Membros podem criar sessões para sua conta
CREATE POLICY "Company members can insert interview sessions"
ON public.culture_interview_sessions
FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT account_id FROM account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 2. Policy para UPDATE: Membros podem atualizar sessões da sua conta
CREATE POLICY "Company members can update interview sessions"
ON public.culture_interview_sessions
FOR UPDATE
USING (
  account_id IN (
    SELECT account_id FROM account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  account_id IN (
    SELECT account_id FROM account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);
