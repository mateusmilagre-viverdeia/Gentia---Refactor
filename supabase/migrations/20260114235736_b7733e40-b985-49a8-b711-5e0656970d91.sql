-- Create table for direct sales tracking (85% to franchisee, 15% to EP)
CREATE TABLE public.partner_direct_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES ep_partners(id) NOT NULL,
  org_id uuid REFERENCES companies(id),
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  total_amount numeric(10,2) NOT NULL,
  partner_share_percentage numeric(5,2) DEFAULT 85.00,
  partner_share_amount numeric(10,2) NOT NULL,
  ep_share_amount numeric(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'paid')),
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL,
  notes text
);

-- Enable RLS
ALTER TABLE public.partner_direct_sales ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all direct sales
CREATE POLICY "Super admins can manage direct sales"
  ON public.partner_direct_sales FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Partners can view their own direct sales
CREATE POLICY "Partners can view own direct sales"
  ON public.partner_direct_sales FOR SELECT
  USING (partner_id IN (SELECT id FROM ep_partners WHERE user_id = auth.uid()));

-- Add column to track partner's own project grant
ALTER TABLE public.ep_partners 
ADD COLUMN IF NOT EXISTS own_project_grant_id uuid REFERENCES partner_client_grants(id);

-- Enable realtime for partner_direct_sales
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_direct_sales;