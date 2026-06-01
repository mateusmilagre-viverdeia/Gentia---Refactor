-- Auto-sync credits_per_period em assinaturas ativas quando o pacote é editado no admin
CREATE OR REPLACE FUNCTION public.sync_subscription_credits_on_package_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.credits IS DISTINCT FROM OLD.credits THEN
    UPDATE public.org_credit_subscriptions
    SET credits_per_period = NEW.credits,
        updated_at = now()
    WHERE package_id = NEW.id
      AND status = 'active'
      AND credits_per_period <> NEW.credits;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_subscription_credits_on_package_update
  ON public.recruitment_credit_packages;

CREATE TRIGGER trg_sync_subscription_credits_on_package_update
AFTER UPDATE OF credits ON public.recruitment_credit_packages
FOR EACH ROW
EXECUTE FUNCTION public.sync_subscription_credits_on_package_update();