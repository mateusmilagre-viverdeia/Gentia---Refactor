-- ==================================================
-- FASE 2: Schema de Billing Multi-Organização
-- ==================================================

-- Tabela org_billing: status de billing por organização
CREATE TABLE public.org_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'unpaid' 
    CHECK (status IN ('unpaid', 'active', 'past_due', 'canceled', 'blocked')),
  current_period_end TIMESTAMPTZ,
  grace_until TIMESTAMPTZ,
  blocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela org_seats: tracking de seats por organização
CREATE TABLE public.org_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  included_seats INTEGER DEFAULT 1,
  current_seat_count INTEGER DEFAULT 0,
  stripe_base_item_id TEXT, -- ID do item base (org) na subscription
  stripe_seat_item_id TEXT, -- ID do item de seats na subscription
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela admin_grants: liberação manual sem custo
CREATE TABLE public.admin_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL,
  reason TEXT NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT at_least_one_target CHECK (org_id IS NOT NULL OR user_id IS NOT NULL)
);

-- Tabela billing_events: auditoria de eventos de billing
CREATE TABLE public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_org_billing_status ON public.org_billing(status);
CREATE INDEX idx_org_billing_stripe_customer ON public.org_billing(stripe_customer_id);
CREATE INDEX idx_admin_grants_org_active ON public.admin_grants(org_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_admin_grants_user_active ON public.admin_grants(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_admin_grants_expires ON public.admin_grants(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_billing_events_org ON public.billing_events(org_id);
CREATE INDEX idx_billing_events_type ON public.billing_events(event_type);

-- Trigger para updated_at em org_billing
CREATE TRIGGER update_org_billing_updated_at
  BEFORE UPDATE ON public.org_billing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at em org_seats
CREATE TRIGGER update_org_seats_updated_at
  BEFORE UPDATE ON public.org_seats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==================================================
-- RLS Policies
-- ==================================================

-- Enable RLS
ALTER TABLE public.org_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- org_billing: owners/admins podem ver sua org, super_admin/head_cs podem ver todas
CREATE POLICY "org_billing_select" ON public.org_billing
  FOR SELECT USING (
    is_super_admin(auth.uid()) 
    OR is_head_cs(auth.uid())
    OR is_account_admin_or_owner(auth.uid(), org_id)
  );

CREATE POLICY "org_billing_insert" ON public.org_billing
  FOR INSERT WITH CHECK (
    is_super_admin(auth.uid()) 
    OR is_head_cs(auth.uid())
  );

CREATE POLICY "org_billing_update" ON public.org_billing
  FOR UPDATE USING (
    is_super_admin(auth.uid()) 
    OR is_head_cs(auth.uid())
  );

-- org_seats: mesma lógica
CREATE POLICY "org_seats_select" ON public.org_seats
  FOR SELECT USING (
    is_super_admin(auth.uid()) 
    OR is_head_cs(auth.uid())
    OR is_account_admin_or_owner(auth.uid(), org_id)
  );

CREATE POLICY "org_seats_insert" ON public.org_seats
  FOR INSERT WITH CHECK (
    is_super_admin(auth.uid()) 
    OR is_head_cs(auth.uid())
  );

CREATE POLICY "org_seats_update" ON public.org_seats
  FOR UPDATE USING (
    is_super_admin(auth.uid()) 
    OR is_head_cs(auth.uid())
  );

-- admin_grants: apenas super_admin e head_cs podem gerenciar
CREATE POLICY "admin_grants_select" ON public.admin_grants
  FOR SELECT USING (
    is_super_admin(auth.uid()) 
    OR is_head_cs(auth.uid())
  );

CREATE POLICY "admin_grants_insert" ON public.admin_grants
  FOR INSERT WITH CHECK (
    is_super_admin(auth.uid()) 
    OR is_head_cs(auth.uid())
  );

CREATE POLICY "admin_grants_update" ON public.admin_grants
  FOR UPDATE USING (
    is_super_admin(auth.uid()) 
    OR is_head_cs(auth.uid())
  );

-- billing_events: leitura para owners, escrita apenas via service role
CREATE POLICY "billing_events_select" ON public.billing_events
  FOR SELECT USING (
    is_super_admin(auth.uid()) 
    OR is_head_cs(auth.uid())
    OR (org_id IS NOT NULL AND is_account_admin_or_owner(auth.uid(), org_id))
  );

-- ==================================================
-- Função check_org_access: verifica se org pode ser acessada
-- ==================================================
CREATE OR REPLACE FUNCTION public.check_org_access(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_billing_status TEXT;
  v_has_grant BOOLEAN;
BEGIN
  -- Verificar se tem admin_grant ativo
  SELECT EXISTS (
    SELECT 1 FROM public.admin_grants
    WHERE org_id = p_org_id
    AND expires_at > NOW()
    AND revoked_at IS NULL
  ) INTO v_has_grant;
  
  IF v_has_grant THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar status de billing
  SELECT status INTO v_billing_status
  FROM public.org_billing
  WHERE org_id = p_org_id;
  
  -- Se não tem billing, assume trial/unpaid mas permite acesso temporário
  IF v_billing_status IS NULL THEN
    RETURN TRUE; -- Por enquanto, permitir acesso para orgs sem billing
  END IF;
  
  -- Permitir acesso se status é active ou past_due (dentro do grace)
  RETURN v_billing_status IN ('active', 'past_due', 'unpaid');
END;
$function$;

-- ==================================================
-- Função has_valid_grant: verifica se usuário/org tem grant
-- ==================================================
CREATE OR REPLACE FUNCTION public.has_valid_grant(p_org_id UUID DEFAULT NULL, p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_grants
    WHERE (
      (p_org_id IS NOT NULL AND org_id = p_org_id)
      OR (p_user_id IS NOT NULL AND user_id = p_user_id)
    )
    AND expires_at > NOW()
    AND revoked_at IS NULL
  )
$function$;

-- ==================================================
-- Função get_org_billing_status: retorna status completo
-- ==================================================
CREATE OR REPLACE FUNCTION public.get_org_billing_status(p_org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'status', COALESCE(ob.status, 'unpaid'),
    'has_subscription', ob.stripe_subscription_id IS NOT NULL,
    'current_period_end', ob.current_period_end,
    'grace_until', ob.grace_until,
    'blocked_at', ob.blocked_at,
    'has_grant', has_valid_grant(p_org_id, NULL),
    'grant_expires_at', (
      SELECT expires_at FROM admin_grants 
      WHERE org_id = p_org_id AND revoked_at IS NULL AND expires_at > NOW()
      ORDER BY expires_at DESC LIMIT 1
    ),
    'can_access', check_org_access(p_org_id),
    'seat_count', COALESCE(os.current_seat_count, 0),
    'included_seats', COALESCE(os.included_seats, 1)
  ) INTO v_result
  FROM public.companies c
  LEFT JOIN public.org_billing ob ON ob.org_id = c.id
  LEFT JOIN public.org_seats os ON os.org_id = c.id
  WHERE c.id = p_org_id;
  
  RETURN v_result;
END;
$function$;