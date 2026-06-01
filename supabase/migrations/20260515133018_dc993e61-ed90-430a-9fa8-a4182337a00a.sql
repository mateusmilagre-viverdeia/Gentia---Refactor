-- Add intent tracking columns
ALTER TABLE public.recruitment_hunting_results
  ADD COLUMN IF NOT EXISTS intent_signals jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS intent_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS intent_detected_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_refreshed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_hunting_results_intent_score
  ON public.recruitment_hunting_results (intent_score DESC NULLS LAST);

-- Allow stackoverflow source
ALTER TABLE public.recruitment_hunting_results
  DROP CONSTRAINT IF EXISTS recruitment_hunting_results_source_check;
ALTER TABLE public.recruitment_hunting_results
  ADD CONSTRAINT recruitment_hunting_results_source_check
  CHECK (source = ANY (ARRAY['linkedin','github','stackoverflow','portfolio','other']));

-- Intent signals log (history per result)
CREATE TABLE IF NOT EXISTS public.recruitment_hunting_intent_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  hunting_result_id uuid NOT NULL REFERENCES public.recruitment_hunting_results(id) ON DELETE CASCADE,
  signal_type text NOT NULL CHECK (signal_type IN (
    'open_to_work','job_change','promotion','company_layoff',
    'activity_spike','new_skill','location_change','tenure_milestone'
  )),
  signal_strength integer NOT NULL DEFAULT 50 CHECK (signal_strength BETWEEN 0 AND 100),
  evidence jsonb DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  source text DEFAULT 'refresh'
);

CREATE INDEX IF NOT EXISTS idx_intent_signals_result
  ON public.recruitment_hunting_intent_signals (hunting_result_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_intent_signals_account_type
  ON public.recruitment_hunting_intent_signals (account_id, signal_type, detected_at DESC);

ALTER TABLE public.recruitment_hunting_intent_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members view intent signals"
  ON public.recruitment_hunting_intent_signals FOR SELECT
  USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Service can insert intent signals"
  ON public.recruitment_hunting_intent_signals FOR INSERT
  WITH CHECK (is_account_member(auth.uid(), account_id));

-- Search attempts log (rounds of self-tuning autonomous search)
CREATE TABLE IF NOT EXISTS public.recruitment_hunting_search_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid NOT NULL REFERENCES public.recruitment_hunting_searches(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  round_number integer NOT NULL DEFAULT 1,
  strategy text NOT NULL,
  criteria_relaxed jsonb DEFAULT '[]'::jsonb,
  results_count integer DEFAULT 0,
  qualified_count integer DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_hunting_attempts_search
  ON public.recruitment_hunting_search_attempts (search_id, round_number);

ALTER TABLE public.recruitment_hunting_search_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members view search attempts"
  ON public.recruitment_hunting_search_attempts FOR SELECT
  USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Account members insert search attempts"
  ON public.recruitment_hunting_search_attempts FOR INSERT
  WITH CHECK (is_account_member(auth.uid(), account_id));