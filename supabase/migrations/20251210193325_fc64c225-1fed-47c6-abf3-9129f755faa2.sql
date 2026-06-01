-- Create culture_code_version_history table
CREATE TABLE public.culture_code_version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES culture_code_sessions(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  variant TEXT NOT NULL DEFAULT 'update',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.culture_code_version_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can view culture code history"
  ON public.culture_code_version_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM culture_code_sessions ccs
    WHERE ccs.id = culture_code_version_history.session_id
    AND is_account_member(auth.uid(), ccs.account_id)
  ));

CREATE POLICY "Members can insert culture code history"
  ON public.culture_code_version_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM culture_code_sessions ccs
    WHERE ccs.id = culture_code_version_history.session_id
    AND is_account_member(auth.uid(), ccs.account_id)
  ));

CREATE POLICY "Members can delete culture code history"
  ON public.culture_code_version_history FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM culture_code_sessions ccs
    WHERE ccs.id = culture_code_version_history.session_id
    AND is_account_member(auth.uid(), ccs.account_id)
  ));