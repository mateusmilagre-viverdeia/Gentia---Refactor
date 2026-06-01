-- Create version history table for people analyses
CREATE TABLE public.people_analysis_version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.people_analyses(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  variant TEXT DEFAULT 'manual'
);

-- Enable RLS
ALTER TABLE public.people_analysis_version_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for owner/admin only (same as people_analyses)
CREATE POLICY "Admins can view analysis version history"
ON public.people_analysis_version_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM people_analyses pa
    WHERE pa.id = people_analysis_version_history.analysis_id
    AND is_account_admin_or_owner(auth.uid(), pa.account_id)
  )
);

CREATE POLICY "Admins can create analysis version history"
ON public.people_analysis_version_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM people_analyses pa
    WHERE pa.id = people_analysis_version_history.analysis_id
    AND is_account_admin_or_owner(auth.uid(), pa.account_id)
  )
);

CREATE POLICY "Admins can delete analysis version history"
ON public.people_analysis_version_history
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM people_analyses pa
    WHERE pa.id = people_analysis_version_history.analysis_id
    AND is_account_admin_or_owner(auth.uid(), pa.account_id)
  )
);