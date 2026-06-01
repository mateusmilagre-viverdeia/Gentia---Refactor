-- Add activity tracking columns to account_members
ALTER TABLE public.account_members 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_access_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deactivated_by UUID;

-- Add email tracking columns to account_invites
ALTER TABLE public.account_invites
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_error TEXT;

-- Create function to update last access (to be called from frontend)
CREATE OR REPLACE FUNCTION public.update_member_last_access(p_user_id UUID, p_account_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.account_members
  SET last_access_at = NOW()
  WHERE user_id = p_user_id AND account_id = p_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_member_last_access(UUID, UUID) TO authenticated;