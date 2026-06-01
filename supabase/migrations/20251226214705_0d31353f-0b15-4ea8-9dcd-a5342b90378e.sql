-- Create table for 2FA backup codes
CREATE TABLE public.backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, code_hash)
);

-- Enable Row Level Security
ALTER TABLE public.backup_codes ENABLE ROW LEVEL SECURITY;

-- Policy: users can only manage their own backup codes
CREATE POLICY "Users can view their own backup codes"
ON public.backup_codes
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own backup codes"
ON public.backup_codes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own backup codes"
ON public.backup_codes
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own backup codes"
ON public.backup_codes
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_backup_codes_user_id ON public.backup_codes(user_id);
CREATE INDEX idx_backup_codes_unused ON public.backup_codes(user_id) WHERE used_at IS NULL;