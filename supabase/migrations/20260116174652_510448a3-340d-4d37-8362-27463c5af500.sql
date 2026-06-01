-- Create license usage statistics table for reports
CREATE TABLE IF NOT EXISTS public.license_usage_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  total_accounts INTEGER NOT NULL DEFAULT 0,
  full_access_count INTEGER NOT NULL DEFAULT 0,
  view_only_count INTEGER NOT NULL DEFAULT 0,
  disabled_count INTEGER NOT NULL DEFAULT 0,
  accounts_with_restrictions INTEGER NOT NULL DEFAULT 0,
  module_stats JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(snapshot_date)
);

-- Enable RLS
ALTER TABLE public.license_usage_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for EP team only (using correct column name 'active')
CREATE POLICY "EP team can read license snapshots"
ON public.license_usage_snapshots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ep_consultants ec
    WHERE ec.user_id = auth.uid()
    AND ec.active = true
  )
);

CREATE POLICY "EP team can insert license snapshots"
ON public.license_usage_snapshots
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ep_consultants ec
    WHERE ec.user_id = auth.uid()
    AND ec.active = true
  )
);

-- Create index for date queries
CREATE INDEX IF NOT EXISTS idx_license_usage_snapshots_date 
ON public.license_usage_snapshots(snapshot_date DESC);

-- Function to generate daily license snapshot
CREATE OR REPLACE FUNCTION public.generate_license_snapshot()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total_accounts INTEGER;
  v_full_count INTEGER;
  v_view_only_count INTEGER;
  v_disabled_count INTEGER;
  v_restricted_accounts INTEGER;
  v_module_stats JSONB;
BEGIN
  -- Count total active accounts
  SELECT COUNT(*) INTO v_total_accounts
  FROM public.companies
  WHERE status = 'active';

  -- Count by access level (counting unique account-module combinations)
  SELECT 
    COUNT(*) FILTER (WHERE access_level = 'full'),
    COUNT(*) FILTER (WHERE access_level = 'view_only'),
    COUNT(*) FILTER (WHERE access_level = 'disabled')
  INTO v_full_count, v_view_only_count, v_disabled_count
  FROM public.account_licensed_modules;

  -- Count accounts with restrictions
  SELECT COUNT(DISTINCT account_id) INTO v_restricted_accounts
  FROM public.account_licensed_modules
  WHERE access_level IN ('view_only', 'disabled');

  -- Get per-module stats
  SELECT jsonb_object_agg(
    module_slug,
    jsonb_build_object(
      'full', SUM(CASE WHEN access_level = 'full' THEN 1 ELSE 0 END),
      'view_only', SUM(CASE WHEN access_level = 'view_only' THEN 1 ELSE 0 END),
      'disabled', SUM(CASE WHEN access_level = 'disabled' THEN 1 ELSE 0 END)
    )
  ) INTO v_module_stats
  FROM public.account_licensed_modules
  GROUP BY module_slug;

  -- Insert or update today's snapshot
  INSERT INTO public.license_usage_snapshots (
    snapshot_date,
    total_accounts,
    full_access_count,
    view_only_count,
    disabled_count,
    accounts_with_restrictions,
    module_stats
  ) VALUES (
    CURRENT_DATE,
    v_total_accounts,
    v_full_count,
    v_view_only_count,
    v_disabled_count,
    v_restricted_accounts,
    COALESCE(v_module_stats, '{}'::jsonb)
  )
  ON CONFLICT (snapshot_date) 
  DO UPDATE SET
    total_accounts = EXCLUDED.total_accounts,
    full_access_count = EXCLUDED.full_access_count,
    view_only_count = EXCLUDED.view_only_count,
    disabled_count = EXCLUDED.disabled_count,
    accounts_with_restrictions = EXCLUDED.accounts_with_restrictions,
    module_stats = EXCLUDED.module_stats;
END;
$$;