-- =====================================================
-- SISTEMA DE NOTIFICAÇÕES - CENTRAL DE NOTIFICAÇÕES
-- =====================================================

-- 1. Expandir tabela notifications existente
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.companies(id),
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS dedupe_key text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS target_url text;

-- Criar índice único para dedupe_key (apenas quando não nulo)
CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe_key_unique 
  ON public.notifications (dedupe_key) 
  WHERE dedupe_key IS NOT NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS notifications_org_id_idx ON public.notifications(org_id);
CREATE INDEX IF NOT EXISTS notifications_entity_idx ON public.notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);

-- 2. Criar tabela notification_recipients
CREATE TABLE IF NOT EXISTS public.notification_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz,
  archived_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Índices para notification_recipients
CREATE INDEX IF NOT EXISTS notification_recipients_user_idx ON public.notification_recipients(user_id);
CREATE INDEX IF NOT EXISTS notification_recipients_unread_idx ON public.notification_recipients(user_id, read_at) WHERE read_at IS NULL;

-- 3. Criar tabela announcements (Comunicados)
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  published_by uuid NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para announcements
CREATE INDEX IF NOT EXISTS announcements_org_idx ON public.announcements(org_id);
CREATE INDEX IF NOT EXISTS announcements_published_at_idx ON public.announcements(published_at DESC);

-- 4. Criar tabela notification_preferences (opcional, para futuro)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  in_app_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

-- 5. Enable RLS
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies para notification_recipients
-- Usuário só vê as suas próprias notificações
CREATE POLICY "Users can view their own notification recipients"
  ON public.notification_recipients
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification recipients"
  ON public.notification_recipients
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Sistema pode inserir (via service role)
CREATE POLICY "System can insert notification recipients"
  ON public.notification_recipients
  FOR INSERT
  WITH CHECK (true);

-- 7. RLS Policies para announcements
-- Membros da org podem ver comunicados
CREATE POLICY "Org members can view announcements"
  ON public.announcements
  FOR SELECT
  USING (
    is_account_member(auth.uid(), org_id) OR
    is_super_admin(auth.uid())
  );

-- Apenas owner/admin podem criar comunicados
CREATE POLICY "Admins can create announcements"
  ON public.announcements
  FOR INSERT
  WITH CHECK (
    is_account_admin_or_owner(auth.uid(), org_id)
  );

-- Apenas owner/admin podem atualizar/deletar
CREATE POLICY "Admins can update announcements"
  ON public.announcements
  FOR UPDATE
  USING (is_account_admin_or_owner(auth.uid(), org_id));

CREATE POLICY "Admins can delete announcements"
  ON public.announcements
  FOR DELETE
  USING (is_account_admin_or_owner(auth.uid(), org_id));

-- 8. RLS Policies para notification_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences"
  ON public.notification_preferences
  FOR ALL
  USING (auth.uid() = user_id);

-- 9. Atualizar RLS da tabela notifications existente
-- Primeiro remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- Criar novas políticas mais completas
-- Usuários veem notificações:
-- 1. Direcionadas a eles diretamente (user_id = auth.uid())
-- 2. OU que estão em notification_recipients
-- 3. OU são de uma org da qual são membros (para broadcast)
CREATE POLICY "Users can view relevant notifications"
  ON public.notifications
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    is_super_admin(auth.uid()) OR
    (org_id IS NOT NULL AND is_account_member(auth.uid(), org_id)) OR
    EXISTS (
      SELECT 1 FROM notification_recipients nr 
      WHERE nr.notification_id = id AND nr.user_id = auth.uid()
    )
  );

-- Usuários podem atualizar suas próprias notificações (marcar como lida)
CREATE POLICY "Users can update their notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- Sistema pode inserir notificações
CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- 10. Habilitar realtime para notificações
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_recipients;