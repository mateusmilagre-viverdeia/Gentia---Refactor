-- Create assessment_invitations table for DISC and QA invitations
CREATE TABLE public.assessment_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  invited_user_id UUID NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('disc', 'qa')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  session_id UUID,
  sent_at TIMESTAMPTZ DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for common queries
CREATE INDEX idx_assessment_invitations_invited_user ON assessment_invitations(invited_user_id, status);
CREATE INDEX idx_assessment_invitations_account ON assessment_invitations(account_id, assessment_type);

-- Enable RLS
ALTER TABLE assessment_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can view all invitations for their account
CREATE POLICY "Admins can view account invitations"
ON assessment_invitations FOR SELECT TO authenticated
USING (
  is_pulse_admin_or_leader(auth.uid(), account_id)
  OR invited_user_id = auth.uid()
);

-- Admins can create invitations
CREATE POLICY "Admins can create invitations"
ON assessment_invitations FOR INSERT TO authenticated
WITH CHECK (
  is_pulse_admin_or_leader(auth.uid(), account_id)
  AND invited_by = auth.uid()
);

-- Admins can update invitations they created, users can update their own invitations
CREATE POLICY "Users can update invitations"
ON assessment_invitations FOR UPDATE TO authenticated
USING (
  invited_user_id = auth.uid()
  OR is_pulse_admin_or_leader(auth.uid(), account_id)
)
WITH CHECK (
  invited_user_id = auth.uid()
  OR is_pulse_admin_or_leader(auth.uid(), account_id)
);

-- Admins can delete invitations
CREATE POLICY "Admins can delete invitations"
ON assessment_invitations FOR DELETE TO authenticated
USING (
  is_pulse_admin_or_leader(auth.uid(), account_id)
);

-- Enable realtime for invitations
ALTER PUBLICATION supabase_realtime ADD TABLE public.assessment_invitations;