
ALTER TABLE public.account_settings
  ADD COLUMN IF NOT EXISTS evaluator_optimization_tier text NOT NULL DEFAULT 'optimized'
  CHECK (evaluator_optimization_tier IN ('stable', 'optimized', 'experimental'));

CREATE INDEX IF NOT EXISTS idx_ai_exec_logs_function_created
  ON public.ai_execution_logs (function_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_exec_logs_account_created
  ON public.ai_execution_logs (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_cost_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL UNIQUE,
  avg_cost_brl numeric NOT NULL,
  avg_tokens integer,
  period_start timestamptz,
  period_end timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_cost_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read baselines"
  ON public.ai_cost_baselines FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage baselines"
  ON public.ai_cost_baselines FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.llm_cost_monthly_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year int NOT NULL,
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  total_cost_brl numeric NOT NULL DEFAULT 0,
  total_sessions int NOT NULL DEFAULT 0,
  savings_vs_baseline_brl numeric NOT NULL DEFAULT 0,
  savings_pct numeric NOT NULL DEFAULT 0,
  per_function jsonb NOT NULL DEFAULT '{}'::jsonb,
  top_accounts jsonb NOT NULL DEFAULT '[]'::jsonb,
  anomalies_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_year, period_month)
);
ALTER TABLE public.llm_cost_monthly_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read snapshots"
  ON public.llm_cost_monthly_snapshots FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.evaluator_tier_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  old_tier text,
  new_tier text NOT NULL,
  changed_by uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.evaluator_tier_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read tier change log"
  ON public.evaluator_tier_change_log FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert tier change log"
  ON public.evaluator_tier_change_log FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.ai_cost_baselines (function_name, avg_cost_brl, notes)
VALUES
  ('culture-interview-complete', 0.27, 'Pre-Phase 1 baseline (gemini-3-pro-preview, no compression, no tool calling)'),
  ('technical-interview-complete', 0.045, 'Pre-Phase 1 baseline (gemini-3-flash-preview, no compression)'),
  ('analyze-cv-job-match', 0.028, 'Pre-Phase 1 baseline (gemini-3-flash-preview, JSON parsing)')
ON CONFLICT (function_name) DO NOTHING;
