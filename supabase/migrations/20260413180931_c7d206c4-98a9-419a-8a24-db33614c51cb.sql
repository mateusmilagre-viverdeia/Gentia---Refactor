
ALTER TABLE public.job_icps
  ADD COLUMN IF NOT EXISTS linkedin_boolean_query text,
  ADD COLUMN IF NOT EXISTS apollo_filters_json jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sales_navigator_url text,
  ADD COLUMN IF NOT EXISTS scoring_weights jsonb DEFAULT '{"required": 0.4, "desired": 0.2, "experience": 0.2, "culture": 0.2}';
