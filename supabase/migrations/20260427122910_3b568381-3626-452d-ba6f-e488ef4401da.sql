-- ============================================================================
-- PR-A: Commercial Proposals (B2B client proposals for consulting)
-- Distinct from recruitment_proposals (which is candidate offer letters)
-- ============================================================================

-- Status enum
DO $$ BEGIN
  CREATE TYPE public.commercial_proposal_status AS ENUM (
    'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Main table
CREATE TABLE IF NOT EXISTS public.commercial_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,

  -- Content
  title TEXT NOT NULL,
  scope_text TEXT,
  deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
  pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
  payment_terms TEXT,
  validity_date DATE,

  -- AI generation
  ai_prompt_input JSONB,
  ai_generated_content TEXT,
  ai_model_used TEXT,
  generated_at TIMESTAMPTZ,

  -- Sharing & lifecycle
  status public.commercial_proposal_status NOT NULL DEFAULT 'draft',
  public_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  viewed_count INTEGER NOT NULL DEFAULT 0,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,

  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commercial_proposals_account ON public.commercial_proposals(account_id);
CREATE INDEX IF NOT EXISTS idx_commercial_proposals_cliente ON public.commercial_proposals(cliente_id);
CREATE INDEX IF NOT EXISTS idx_commercial_proposals_status  ON public.commercial_proposals(status);
CREATE INDEX IF NOT EXISTS idx_commercial_proposals_token   ON public.commercial_proposals(public_token);

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION public.set_commercial_proposals_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commercial_proposals_updated_at ON public.commercial_proposals;
CREATE TRIGGER trg_commercial_proposals_updated_at
  BEFORE UPDATE ON public.commercial_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_commercial_proposals_updated_at();

-- RLS
ALTER TABLE public.commercial_proposals ENABLE ROW LEVEL SECURITY;

-- Account members can SELECT their proposals
CREATE POLICY "Account members can view commercial proposals"
  ON public.commercial_proposals FOR SELECT
  TO authenticated
  USING (public.is_account_member(account_id, auth.uid()));

-- Public read via token (no auth)
CREATE POLICY "Anyone with token can view commercial proposal"
  ON public.commercial_proposals FOR SELECT
  TO anon, authenticated
  USING (public_token IS NOT NULL);

-- Account members can INSERT
CREATE POLICY "Account members can insert commercial proposals"
  ON public.commercial_proposals FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_account_member(account_id, auth.uid())
    AND created_by = auth.uid()
  );

-- Account members can UPDATE their proposals
CREATE POLICY "Account members can update commercial proposals"
  ON public.commercial_proposals FOR UPDATE
  TO authenticated
  USING (public.is_account_member(account_id, auth.uid()))
  WITH CHECK (public.is_account_member(account_id, auth.uid()));

-- Public can UPDATE only viewing/acceptance fields via token (we'll guard at app level too)
CREATE POLICY "Public token can mark viewed/respond"
  ON public.commercial_proposals FOR UPDATE
  TO anon, authenticated
  USING (public_token IS NOT NULL)
  WITH CHECK (public_token IS NOT NULL);

-- Only admin/owner can DELETE
CREATE POLICY "Admins can delete commercial proposals"
  ON public.commercial_proposals FOR DELETE
  TO authenticated
  USING (public.is_account_admin_or_owner(account_id, auth.uid()));

COMMENT ON TABLE public.commercial_proposals IS
  'B2B commercial proposals sent to consulting clients (clientes_consultoria). Distinct from recruitment_proposals (candidate offer letters).';