-- =============================================
-- 1. AUDIT LOGS TABLE FOR EP CONSULTANT ACCESS
-- =============================================

CREATE TABLE public.consultant_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consultant_id UUID NOT NULL REFERENCES public.ep_consultants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_consultant_access_logs_consultant_id ON public.consultant_access_logs(consultant_id);
CREATE INDEX idx_consultant_access_logs_account_id ON public.consultant_access_logs(account_id);
CREATE INDEX idx_consultant_access_logs_created_at ON public.consultant_access_logs(created_at DESC);
CREATE INDEX idx_consultant_access_logs_action ON public.consultant_access_logs(action);

-- Enable RLS
ALTER TABLE public.consultant_access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: EP Team (super_admin, head_cs) can view all audit logs
CREATE POLICY "EP Team can view all audit logs"
ON public.consultant_access_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'head_cs')
  )
);

-- Policy: Consultants can view their own audit logs
CREATE POLICY "Consultants can view own audit logs"
ON public.consultant_access_logs
FOR SELECT
USING (user_id = auth.uid());

-- Policy: Authenticated users can insert (for logging)
CREATE POLICY "Authenticated users can insert audit logs"
ON public.consultant_access_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- 2. CONSULTANT NOTIFICATIONS PREFERENCES TABLE
-- =============================================

CREATE TABLE public.consultant_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consultant_id UUID NOT NULL REFERENCES public.ep_consultants(id) ON DELETE CASCADE,
  notify_pending_actions BOOLEAN DEFAULT true,
  notify_upcoming_checkpoints BOOLEAN DEFAULT true,
  notify_overdue_actions BOOLEAN DEFAULT true,
  checkpoint_reminder_days INTEGER DEFAULT 3,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(consultant_id)
);

-- Enable RLS
ALTER TABLE public.consultant_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Consultants can manage their own preferences
CREATE POLICY "Consultants can manage own preferences"
ON public.consultant_notification_preferences
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.ep_consultants ec
    WHERE ec.id = consultant_id
    AND ec.user_id = auth.uid()
  )
);

-- Policy: EP Team can view all preferences
CREATE POLICY "EP Team can view all preferences"
ON public.consultant_notification_preferences
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'head_cs')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_consultant_notification_preferences_updated_at
BEFORE UPDATE ON public.consultant_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 3. FUNCTION TO LOG CONSULTANT ACCESS
-- =============================================

CREATE OR REPLACE FUNCTION public.log_consultant_access(
  p_account_id UUID,
  p_action VARCHAR(100),
  p_resource_type VARCHAR(100),
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consultant_id UUID;
  v_log_id UUID;
BEGIN
  -- Get consultant_id for current user
  SELECT id INTO v_consultant_id
  FROM public.ep_consultants
  WHERE user_id = auth.uid()
  AND active = true;
  
  -- Only log if user is an EP consultant
  IF v_consultant_id IS NOT NULL THEN
    INSERT INTO public.consultant_access_logs (
      consultant_id,
      user_id,
      account_id,
      action,
      resource_type,
      resource_id,
      metadata
    ) VALUES (
      v_consultant_id,
      auth.uid(),
      p_account_id,
      p_action,
      p_resource_type,
      p_resource_id,
      p_metadata
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.log_consultant_access TO authenticated;

-- =============================================
-- 4. FUNCTION TO CREATE CONSULTANT NOTIFICATIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.create_consultant_notification(
  p_consultant_user_id UUID,
  p_account_id UUID,
  p_type VARCHAR(100),
  p_title TEXT,
  p_message TEXT,
  p_target_url TEXT DEFAULT NULL,
  p_entity_type VARCHAR(100) DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_priority VARCHAR(20) DEFAULT 'normal'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Create notification
  INSERT INTO public.notifications (
    user_id,
    account_id,
    type,
    title,
    message,
    target_url,
    entity_type,
    entity_id,
    priority
  ) VALUES (
    p_consultant_user_id,
    p_account_id,
    p_type,
    p_title,
    p_message,
    p_target_url,
    p_entity_type,
    p_entity_id,
    p_priority::text
  )
  RETURNING id INTO v_notification_id;
  
  -- Create recipient record
  INSERT INTO public.notification_recipients (
    notification_id,
    user_id
  ) VALUES (
    v_notification_id,
    p_consultant_user_id
  );
  
  RETURN v_notification_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_consultant_notification TO authenticated;

-- =============================================
-- 5. TRIGGER: Notify consultants on new pending actions
-- =============================================

CREATE OR REPLACE FUNCTION public.notify_consultant_on_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consultant RECORD;
  v_company_name TEXT;
  v_prefs RECORD;
BEGIN
  -- Get company name
  SELECT name INTO v_company_name
  FROM public.companies
  WHERE id = NEW.account_id;
  
  -- Notify all active consultants assigned to this account
  FOR v_consultant IN
    SELECT ec.user_id, ec.id as consultant_id
    FROM public.consultant_assignments ca
    JOIN public.ep_consultants ec ON ec.id = ca.consultant_id
    WHERE ca.account_id = NEW.account_id
    AND ca.active = true
    AND ec.active = true
  LOOP
    -- Check notification preferences
    SELECT * INTO v_prefs
    FROM public.consultant_notification_preferences
    WHERE consultant_id = v_consultant.consultant_id;
    
    -- Default to notify if no preferences set
    IF v_prefs IS NULL OR v_prefs.notify_pending_actions = true THEN
      PERFORM public.create_consultant_notification(
        v_consultant.user_id,
        NEW.account_id,
        'consultant_new_action',
        'Nova ação criada: ' || NEW.title,
        'Uma nova ação foi criada no projeto ' || COALESCE(v_company_name, 'desconhecido'),
        '/consultor/projeto/' || NEW.account_id,
        'checkpoint_action',
        NEW.id,
        'normal'
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new actions
CREATE TRIGGER notify_consultant_on_new_action
AFTER INSERT ON public.checkpoint_actions
FOR EACH ROW
EXECUTE FUNCTION public.notify_consultant_on_action();

-- =============================================
-- 6. TRIGGER: Notify consultants on new checkpoints
-- =============================================

CREATE OR REPLACE FUNCTION public.notify_consultant_on_checkpoint()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consultant RECORD;
  v_company_name TEXT;
  v_prefs RECORD;
BEGIN
  -- Get company name
  SELECT name INTO v_company_name
  FROM public.companies
  WHERE id = NEW.account_id;
  
  -- Notify all active consultants assigned to this account
  FOR v_consultant IN
    SELECT ec.user_id, ec.id as consultant_id
    FROM public.consultant_assignments ca
    JOIN public.ep_consultants ec ON ec.id = ca.consultant_id
    WHERE ca.account_id = NEW.account_id
    AND ca.active = true
    AND ec.active = true
  LOOP
    -- Check notification preferences
    SELECT * INTO v_prefs
    FROM public.consultant_notification_preferences
    WHERE consultant_id = v_consultant.consultant_id;
    
    -- Default to notify if no preferences set
    IF v_prefs IS NULL OR v_prefs.notify_upcoming_checkpoints = true THEN
      PERFORM public.create_consultant_notification(
        v_consultant.user_id,
        NEW.account_id,
        'consultant_new_checkpoint',
        'Novo checkpoint agendado: ' || NEW.topic,
        'Um checkpoint foi agendado para ' || to_char(NEW.checkpoint_date::date, 'DD/MM/YYYY') || ' no projeto ' || COALESCE(v_company_name, 'desconhecido'),
        '/consultor/projeto/' || NEW.account_id,
        'project_checkpoint',
        NEW.id,
        'normal'
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new checkpoints
CREATE TRIGGER notify_consultant_on_new_checkpoint
AFTER INSERT ON public.project_checkpoints
FOR EACH ROW
EXECUTE FUNCTION public.notify_consultant_on_checkpoint();

-- =============================================
-- 7. Enable realtime for audit logs (optional, for monitoring)
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.consultant_access_logs;