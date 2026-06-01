
CREATE TABLE public.platform_stripe_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_org_base TEXT NOT NULL DEFAULT '',
  price_seat_additional TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.platform_stripe_config (price_org_base, price_seat_additional)
VALUES ('price_1SivVVKV6gEseQSlq5aQKC2D', 'price_1SivVkKV6gEseQSlCuzv0qAM');

ALTER TABLE public.platform_stripe_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view platform_stripe_config"
ON public.platform_stripe_config FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update platform_stripe_config"
ON public.platform_stripe_config FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));
