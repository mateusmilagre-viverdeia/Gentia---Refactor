
ALTER TABLE public.recruitment_hunting_results
  ADD COLUMN IF NOT EXISTS email_validation_status text,
  ADD COLUMN IF NOT EXISTS email_validation_provider text,
  ADD COLUMN IF NOT EXISTS email_validation_score numeric,
  ADD COLUMN IF NOT EXISTS email_validated_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_hunting_results_email_validation_status
  ON public.recruitment_hunting_results (email_validation_status);

CREATE TABLE IF NOT EXISTS public.recruitment_hunting_email_validation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid,
  hunting_result_id uuid REFERENCES public.recruitment_hunting_results(id) ON DELETE SET NULL,
  email text NOT NULL,
  provider text NOT NULL DEFAULT 'neverbounce',
  result text,
  score numeric,
  credits_used numeric DEFAULT 0,
  raw_response jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hunting_email_validation_log_account
  ON public.recruitment_hunting_email_validation_log (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hunting_email_validation_log_email
  ON public.recruitment_hunting_email_validation_log (email, created_at DESC);

ALTER TABLE public.recruitment_hunting_email_validation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view email validation logs"
ON public.recruitment_hunting_email_validation_log
FOR SELECT
TO authenticated
USING (
  account_id IS NULL
  OR public.is_account_member(auth.uid(), account_id)
);
