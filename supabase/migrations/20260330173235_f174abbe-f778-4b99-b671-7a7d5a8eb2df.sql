
-- Auto-recharge settings table
CREATE TABLE public.org_auto_recharge_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  threshold numeric NOT NULL DEFAULT 5,
  recharge_package_id uuid REFERENCES public.recruitment_credit_packages(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);

-- Enable RLS
ALTER TABLE public.org_auto_recharge_settings ENABLE ROW LEVEL SECURITY;

-- Org members can read
CREATE POLICY "org_members_can_read_auto_recharge"
  ON public.org_auto_recharge_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = org_id
        AND am.user_id = auth.uid()
        AND am.is_active = true
    )
  );

-- Org admins can insert/update
CREATE POLICY "org_admins_can_manage_auto_recharge"
  ON public.org_auto_recharge_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = org_id
        AND am.user_id = auth.uid()
        AND am.is_active = true
        AND am.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.account_members am
      WHERE am.account_id = org_id
        AND am.user_id = auth.uid()
        AND am.is_active = true
        AND am.role IN ('owner', 'admin')
    )
  );
