-- Pre-grants: allow Admin interno / Sócio EP criar liberações antes do cadastro

CREATE TABLE IF NOT EXISTS public.pre_client_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  cnpj_digits text NOT NULL,

  -- Who is granting
  grant_source text NOT NULL,
  partner_id uuid NULL,

  -- What is granted
  free_seats integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  permission_template_id uuid NULL,
  notes text NULL,

  -- Claim lifecycle
  claimed_at timestamptz NULL,
  claimed_by uuid NULL,
  claimed_org_id uuid NULL,

  revoked_at timestamptz NULL,
  revoked_by uuid NULL,

  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pre_client_grants_cnpj_digits_len CHECK (char_length(cnpj_digits) BETWEEN 11 AND 14),
  CONSTRAINT pre_client_grants_free_seats_nonneg CHECK (free_seats >= 0),
  CONSTRAINT pre_client_grants_grant_source_check CHECK (grant_source IN ('admin','partner')),
  CONSTRAINT pre_client_grants_partner_required CHECK (
    (grant_source = 'admin' AND partner_id IS NULL)
    OR (grant_source = 'partner' AND partner_id IS NOT NULL)
  )
);

-- Optional FKs (soft-optional, to avoid failing if some tables are not present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='permission_templates') THEN
    ALTER TABLE public.pre_client_grants
      ADD CONSTRAINT pre_client_grants_permission_template_id_fkey
      FOREIGN KEY (permission_template_id)
      REFERENCES public.permission_templates(id)
      ON DELETE SET NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ep_partners') THEN
    ALTER TABLE public.pre_client_grants
      ADD CONSTRAINT pre_client_grants_partner_id_fkey
      FOREIGN KEY (partner_id)
      REFERENCES public.ep_partners(id)
      ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='companies') THEN
    ALTER TABLE public.pre_client_grants
      ADD CONSTRAINT pre_client_grants_claimed_org_id_fkey
      FOREIGN KEY (claimed_org_id)
      REFERENCES public.companies(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pre_client_grants_cnpj_digits ON public.pre_client_grants (cnpj_digits);
CREATE INDEX IF NOT EXISTS idx_pre_client_grants_claimed_org_id ON public.pre_client_grants (claimed_org_id);
CREATE INDEX IF NOT EXISTS idx_pre_client_grants_expires_at ON public.pre_client_grants (expires_at);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at_pre_client_grants()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pre_client_grants_updated_at ON public.pre_client_grants;
CREATE TRIGGER trg_pre_client_grants_updated_at
BEFORE UPDATE ON public.pre_client_grants
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_pre_client_grants();

-- RLS
ALTER TABLE public.pre_client_grants ENABLE ROW LEVEL SECURITY;

-- Helper predicate for partner ownership
-- Partner can manage only their own pre-grants
CREATE POLICY "Admins can manage all pre-grants"
ON public.pre_client_grants
FOR ALL
USING (
  public.is_super_admin(auth.uid()) OR public.is_head_cs(auth.uid())
)
WITH CHECK (
  public.is_super_admin(auth.uid()) OR public.is_head_cs(auth.uid())
);

CREATE POLICY "EP partners can manage their pre-grants"
ON public.pre_client_grants
FOR ALL
USING (
  grant_source = 'partner'
  AND partner_id = public.get_user_partner_id(auth.uid())
)
WITH CHECK (
  grant_source = 'partner'
  AND partner_id = public.get_user_partner_id(auth.uid())
);
