-- Create access_requests table for managing access requests to existing organizations
CREATE TABLE public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_email TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  target_org_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  handled_by UUID REFERENCES auth.users(id),
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_access_requests_org ON access_requests(target_org_id);
CREATE INDEX idx_access_requests_status ON access_requests(status);
CREATE INDEX idx_access_requests_requester ON access_requests(requester_id);

-- Enable RLS
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own access requests"
ON access_requests FOR SELECT
USING (auth.uid() = requester_id);

-- Users can create their own requests
CREATE POLICY "Users can create access requests"
ON access_requests FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- Users can cancel their own pending requests
CREATE POLICY "Users can cancel own pending requests"
ON access_requests FOR UPDATE
USING (auth.uid() = requester_id AND status = 'pending')
WITH CHECK (status = 'cancelled');

-- Org admins can view requests for their org
CREATE POLICY "Org admins can view org requests"
ON access_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM account_members am
    WHERE am.account_id = access_requests.target_org_id
    AND am.user_id = auth.uid()
    AND am.role IN ('owner', 'admin', 'admin_rh')
    AND am.is_active = true
  )
);

-- Org admins can update requests for their org
CREATE POLICY "Org admins can update org requests"
ON access_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM account_members am
    WHERE am.account_id = access_requests.target_org_id
    AND am.user_id = auth.uid()
    AND am.role IN ('owner', 'admin', 'admin_rh')
    AND am.is_active = true
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_access_requests_updated_at
BEFORE UPDATE ON access_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();