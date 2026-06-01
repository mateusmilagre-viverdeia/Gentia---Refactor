CREATE TABLE public.llm_batch_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  job_kind text NOT NULL,
  provider text NOT NULL DEFAULT 'openai',
  provider_batch_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','in_progress','completed','failed','expired','cancelled')),
  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_items integer NOT NULL DEFAULT 0,
  completed_items integer NOT NULL DEFAULT 0,
  failed_items integer NOT NULL DEFAULT 0,
  error_message text,
  created_by uuid,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_llm_batch_jobs_account ON public.llm_batch_jobs (account_id, created_at DESC);
CREATE INDEX idx_llm_batch_jobs_status ON public.llm_batch_jobs (status, submitted_at) WHERE status IN ('submitted','in_progress');
CREATE INDEX idx_llm_batch_jobs_provider_id ON public.llm_batch_jobs (provider_batch_id) WHERE provider_batch_id IS NOT NULL;

ALTER TABLE public.llm_batch_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can read batch jobs"
ON public.llm_batch_jobs FOR SELECT
USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Service role manages batch jobs"
ON public.llm_batch_jobs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER trg_llm_batch_jobs_updated_at
BEFORE UPDATE ON public.llm_batch_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();