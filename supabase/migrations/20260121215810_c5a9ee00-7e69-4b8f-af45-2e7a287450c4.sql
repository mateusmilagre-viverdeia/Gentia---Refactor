-- Pre-grant seat entitlement storage
CREATE TABLE IF NOT EXISTS public.org_seat_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  free_seats integer NOT NULL DEFAULT 0,
  valid_until timestamptz NOT NULL,
  source text NOT NULL DEFAULT 'pregrant',
  pregrant_id uuid NULL REFERENCES public.pre_client_grants(id) ON DELETE SET NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_seat_grants_org_id ON public.org_seat_grants(org_id);
CREATE INDEX IF NOT EXISTS idx_org_seat_grants_valid_until ON public.org_seat_grants(valid_until);

ALTER TABLE public.org_seat_grants ENABLE ROW LEVEL SECURITY;

-- Members can view seat grants for their org
CREATE POLICY "Members can view seat grants"
ON public.org_seat_grants
FOR SELECT
USING (user_has_account_access(org_id));

-- Only service role can write seat grants (used by backend functions)
CREATE POLICY "Service role can manage seat grants"
ON public.org_seat_grants
FOR ALL
USING (current_setting('request.jwt.claim.role'::text, true) = 'service_role'::text)
WITH CHECK (current_setting('request.jwt.claim.role'::text, true) = 'service_role'::text);
