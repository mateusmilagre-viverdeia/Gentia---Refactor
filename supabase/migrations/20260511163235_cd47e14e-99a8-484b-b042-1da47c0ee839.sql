ALTER TABLE public.ai_execution_logs
  ADD COLUMN IF NOT EXISTS optimization_version text DEFAULT 'v0_baseline',
  ADD COLUMN IF NOT EXISTS cached_tokens integer,
  ADD COLUMN IF NOT EXISTS compression_ratio numeric(5,3),
  ADD COLUMN IF NOT EXISTS quality_score numeric(5,2);

CREATE INDEX IF NOT EXISTS idx_ai_logs_optimization_version
  ON public.ai_execution_logs (optimization_version, function_name, created_at DESC);