CREATE TABLE public.sales_demo_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  conducted_by uuid NOT NULL,
  prospect_name text,
  prospect_company text,
  prospect_pain text[],
  duration_seconds integer,
  blocks_completed integer[],
  blocks_skipped integer[],
  notes text,
  next_step text,
  outcome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_demo_logs_account ON public.sales_demo_logs(account_id, created_at DESC);

ALTER TABLE public.sales_demo_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view demo logs of their account"
  ON public.sales_demo_logs FOR SELECT
  USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can insert demo logs for their account"
  ON public.sales_demo_logs FOR INSERT
  WITH CHECK (
    public.is_account_member(auth.uid(), account_id)
    AND conducted_by = auth.uid()
  );