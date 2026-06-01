
CREATE TABLE IF NOT EXISTS public.consultancy_portal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  consultancy_name text,
  logo_url text,
  confidentiality_text text DEFAULT 'Este relatório é confidencial e destinado exclusivamente ao cliente indicado.',
  default_shortlist_validity_days integer DEFAULT 30,
  default_opening_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(account_id)
);

ALTER TABLE public.consultancy_portal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org portal settings"
  ON public.consultancy_portal_settings
  FOR ALL
  TO authenticated
  USING (
    account_id IN (
      SELECT am.account_id FROM public.account_members am
      WHERE am.user_id = auth.uid() AND am.is_active = true
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT am.account_id FROM public.account_members am
      WHERE am.user_id = auth.uid() AND am.is_active = true
      AND am.role IN ('owner', 'admin', 'admin_rh')
    )
  );
