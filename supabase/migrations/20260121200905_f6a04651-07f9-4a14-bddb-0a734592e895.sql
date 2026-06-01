-- Allow 'trialing' status in org_billing and auto-provision a 15-day trial for new orgs

-- 1) Update status check constraint to include 'trialing'
ALTER TABLE public.org_billing
  DROP CONSTRAINT IF EXISTS org_billing_status_check;

ALTER TABLE public.org_billing
  ADD CONSTRAINT org_billing_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'unpaid'::text,
        'trialing'::text,
        'active'::text,
        'past_due'::text,
        'canceled'::text,
        'blocked'::text
      ]
    )
  );

-- 2) Auto-create org_billing trial record on company creation
CREATE OR REPLACE FUNCTION public.ensure_org_billing_trial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.org_billing (org_id, status, trial_start, trial_end)
  VALUES (NEW.id, 'trialing', now(), now() + interval '15 days')
  ON CONFLICT (org_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_org_billing_trial ON public.companies;
CREATE TRIGGER trg_ensure_org_billing_trial
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.ensure_org_billing_trial();
