-- PARTE 1: Expandir careers_page_settings
ALTER TABLE careers_page_settings 
  ADD COLUMN IF NOT EXISTS gallery_images text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS show_social_links boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_gallery_section boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_testimonials_section boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_values_section boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS talent_pool_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS job_alerts_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS apply_button_text text DEFAULT 'Candidatar-se',
  ADD COLUMN IF NOT EXISTS footer_text text;

-- PARTE 2: Adicionar redes sociais à tabela companies
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS linkedin text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS youtube text,
  ADD COLUMN IF NOT EXISTS twitter text;

-- PARTE 3: Tabela de depoimentos de funcionários
CREATE TABLE IF NOT EXISTS employee_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  employee_role text,
  employee_photo_url text,
  testimonial_text text NOT NULL,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employee_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view testimonials" ON employee_testimonials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM account_members 
      WHERE account_members.account_id = employee_testimonials.account_id 
      AND account_members.user_id = auth.uid()
      AND account_members.is_active = true
    )
  );

CREATE POLICY "Members can manage testimonials" ON employee_testimonials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM account_members 
      WHERE account_members.account_id = employee_testimonials.account_id 
      AND account_members.user_id = auth.uid()
      AND account_members.is_active = true
    )
  );

-- Public read for careers page
CREATE POLICY "Public can view active testimonials" ON employee_testimonials
  FOR SELECT USING (is_active = true);

-- PARTE 4: Tabela de banco de talentos
CREATE TABLE IF NOT EXISTS talent_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  resume_url text,
  linkedin_url text,
  areas_of_interest text[] DEFAULT '{}',
  message text,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE talent_pool ENABLE ROW LEVEL SECURITY;

-- Public can submit to talent pool
CREATE POLICY "Public can submit to talent pool" ON talent_pool
  FOR INSERT WITH CHECK (true);

-- Members can view and manage talent pool
CREATE POLICY "Members can view talent pool" ON talent_pool
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM account_members 
      WHERE account_members.account_id = talent_pool.account_id 
      AND account_members.user_id = auth.uid()
      AND account_members.is_active = true
    )
  );

CREATE POLICY "Members can manage talent pool" ON talent_pool
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM account_members 
      WHERE account_members.account_id = talent_pool.account_id 
      AND account_members.user_id = auth.uid()
      AND account_members.is_active = true
    )
  );

-- PARTE 5: Tabela de alertas de vagas
CREATE TABLE IF NOT EXISTS job_alert_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  departments text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(account_id, email)
);

ALTER TABLE job_alert_subscriptions ENABLE ROW LEVEL SECURITY;

-- Public can subscribe to alerts
CREATE POLICY "Public can subscribe to job alerts" ON job_alert_subscriptions
  FOR INSERT WITH CHECK (true);

-- Members can view subscriptions
CREATE POLICY "Members can view job alert subscriptions" ON job_alert_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM account_members 
      WHERE account_members.account_id = job_alert_subscriptions.account_id 
      AND account_members.user_id = auth.uid()
      AND account_members.is_active = true
    )
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_employee_testimonials_updated_at ON employee_testimonials;
CREATE TRIGGER update_employee_testimonials_updated_at
  BEFORE UPDATE ON employee_testimonials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_talent_pool_updated_at ON talent_pool;
CREATE TRIGGER update_talent_pool_updated_at
  BEFORE UPDATE ON talent_pool
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();