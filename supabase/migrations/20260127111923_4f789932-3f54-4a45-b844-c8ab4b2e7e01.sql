-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  assigned_to UUID,
  
  -- Conteúdo
  title TEXT NOT NULL,
  description TEXT,
  conversation_context JSONB,
  page_context TEXT,
  category TEXT DEFAULT 'general',
  
  -- Status e Prioridade
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- SLA
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  sla_due_at TIMESTAMPTZ,
  
  -- Avaliação
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  satisfaction_comment TEXT,
  rated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create support_ticket_messages table
CREATE TABLE public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  author_id UUID NOT NULL,
  
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para support_tickets
CREATE INDEX idx_support_tickets_account ON support_tickets(account_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);

-- Índices para support_ticket_messages
CREATE INDEX idx_ticket_messages_ticket ON support_ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_created_at ON support_ticket_messages(created_at);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets

-- SELECT: Users can view their account tickets, EP Team can view all
CREATE POLICY "Users can view their account tickets"
  ON support_tickets FOR SELECT
  USING (
    account_id IN (
      SELECT am.account_id FROM account_members am 
      WHERE am.user_id = auth.uid() AND am.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin', 'head_cs', 'ep_consultant')
    )
  );

-- INSERT: Users can create tickets for their account
CREATE POLICY "Users can create tickets for their account"
  ON support_tickets FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT am.account_id FROM account_members am 
      WHERE am.user_id = auth.uid() AND am.is_active = true
    )
    AND created_by = auth.uid()
  );

-- UPDATE: Users can update their own tickets (for rating), EP Team can update all
CREATE POLICY "Users and EP can update tickets"
  ON support_tickets FOR UPDATE
  USING (
    (created_by = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin', 'head_cs', 'ep_consultant')
    )
    OR
    EXISTS (
      SELECT 1 FROM account_members am 
      WHERE am.account_id = support_tickets.account_id 
      AND am.user_id = auth.uid() 
      AND am.role IN ('owner', 'admin')
      AND am.is_active = true
    )
  );

-- RLS Policies for support_ticket_messages

-- SELECT: Users can view messages of tickets they can access
CREATE POLICY "Users can view ticket messages"
  ON support_ticket_messages FOR SELECT
  USING (
    -- Hide internal messages from non-EP users
    (
      NOT is_internal 
      AND ticket_id IN (
        SELECT t.id FROM support_tickets t
        WHERE t.account_id IN (
          SELECT am.account_id FROM account_members am 
          WHERE am.user_id = auth.uid() AND am.is_active = true
        )
      )
    )
    OR
    -- EP Team can see all messages including internal
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin', 'head_cs', 'ep_consultant')
    )
  );

-- INSERT: Users can add messages to their tickets, EP can add to any
CREATE POLICY "Users can add messages to tickets"
  ON support_ticket_messages FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND (
      -- User's own tickets
      ticket_id IN (
        SELECT t.id FROM support_tickets t
        WHERE t.account_id IN (
          SELECT am.account_id FROM account_members am 
          WHERE am.user_id = auth.uid() AND am.is_active = true
        )
      )
      OR
      -- EP Team can add to any
      EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('super_admin', 'head_cs', 'ep_consultant')
      )
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;