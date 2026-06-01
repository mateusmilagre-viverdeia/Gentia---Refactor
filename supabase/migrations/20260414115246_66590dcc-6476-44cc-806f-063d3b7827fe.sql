
CREATE TABLE public.ai_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  function_name text NOT NULL,
  operation text NOT NULL,
  model text,
  input_summary jsonb DEFAULT '{}',
  output_summary jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'success',
  error_message text,
  duration_ms integer,
  tokens_used integer,
  estimated_cost numeric(10,6),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_logs_account ON public.ai_execution_logs(account_id, created_at DESC);
CREATE INDEX idx_ai_logs_function ON public.ai_execution_logs(function_name, created_at DESC);
CREATE INDEX idx_ai_logs_status ON public.ai_execution_logs(status) WHERE status != 'success';

ALTER TABLE public.ai_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own org AI logs"
  ON public.ai_execution_logs FOR SELECT
  TO authenticated
  USING (
    is_account_member(auth.uid(), account_id)
    OR can_edit_client_project(auth.uid(), account_id)
  );

CREATE POLICY "Service role can insert AI logs"
  ON public.ai_execution_logs FOR INSERT
  TO service_role
  WITH CHECK (true);
