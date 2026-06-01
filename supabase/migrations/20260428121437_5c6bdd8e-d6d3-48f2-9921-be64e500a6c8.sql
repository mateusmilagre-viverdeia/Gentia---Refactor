
-- ============================================================
-- PR-F.1 — chrome_extension_captures
-- ============================================================
CREATE TABLE public.chrome_extension_captures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL,
  captured_by UUID NOT NULL,
  source_url TEXT NOT NULL,
  raw_data JSONB NOT NULL,
  processed_data JSONB,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  candidate_id UUID,
  job_id UUID,
  error_message TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_chrome_ext_captures_account_date
  ON public.chrome_extension_captures (account_id, captured_at DESC);
CREATE INDEX idx_chrome_ext_captures_source_url
  ON public.chrome_extension_captures (account_id, source_url);
CREATE INDEX idx_chrome_ext_captures_status
  ON public.chrome_extension_captures (processing_status);

ALTER TABLE public.chrome_extension_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members and EP consultants can view captures"
ON public.chrome_extension_captures FOR SELECT
TO authenticated
USING (
  public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
);

CREATE POLICY "Members and EP consultants can insert captures"
ON public.chrome_extension_captures FOR INSERT
TO authenticated
WITH CHECK (
  public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
);

CREATE POLICY "Members and EP consultants can update captures"
ON public.chrome_extension_captures FOR UPDATE
TO authenticated
USING (
  public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
);

-- ============================================================
-- PR-G.1 — indeed_feed_config
-- ============================================================
CREATE TABLE public.indeed_feed_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL UNIQUE,
  feed_url TEXT NOT NULL,
  feed_slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  last_submitted_to_indeed_at TIMESTAMPTZ,
  total_jobs_in_feed INTEGER NOT NULL DEFAULT 0,
  indeed_publisher_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_indeed_feed_config_slug ON public.indeed_feed_config (feed_slug);

ALTER TABLE public.indeed_feed_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members and EP consultants can view indeed config"
ON public.indeed_feed_config FOR SELECT
TO authenticated
USING (
  public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
);

CREATE POLICY "Members and EP consultants can insert indeed config"
ON public.indeed_feed_config FOR INSERT
TO authenticated
WITH CHECK (
  public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
);

CREATE POLICY "Members and EP consultants can update indeed config"
ON public.indeed_feed_config FOR UPDATE
TO authenticated
USING (
  public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
);

CREATE TRIGGER update_indeed_feed_config_updated_at
BEFORE UPDATE ON public.indeed_feed_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PR-G.1 — indeed_submission_log
-- ============================================================
CREATE TABLE public.indeed_submission_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL,
  job_id UUID NOT NULL,
  action TEXT NOT NULL,
  feed_generated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_indeed_submission_log_account_date
  ON public.indeed_submission_log (account_id, created_at DESC);
CREATE INDEX idx_indeed_submission_log_job
  ON public.indeed_submission_log (job_id, created_at DESC);

ALTER TABLE public.indeed_submission_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members and EP consultants can view indeed log"
ON public.indeed_submission_log FOR SELECT
TO authenticated
USING (
  public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
);

-- ============================================================
-- PR-G.1 — Storage bucket público para feeds Indeed
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('indeed-feeds', 'indeed-feeds', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Indeed feeds are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'indeed-feeds');
