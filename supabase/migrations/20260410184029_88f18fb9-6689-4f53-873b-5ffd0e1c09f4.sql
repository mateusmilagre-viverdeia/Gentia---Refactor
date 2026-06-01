
-- Table for culture code template PDFs (benchmarking models)
CREATE TABLE public.culture_code_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.culture_code_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view templates
CREATE POLICY "Authenticated can view culture templates"
  ON public.culture_code_templates FOR SELECT TO authenticated USING (true);

-- Only super admins can insert templates
CREATE POLICY "Super admins can insert culture templates"
  ON public.culture_code_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Only super admins can delete templates
CREATE POLICY "Super admins can delete culture templates"
  ON public.culture_code_templates FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Storage bucket for template PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('culture-templates', 'culture-templates', true);

-- Storage policies
CREATE POLICY "Anyone can read culture templates"
  ON storage.objects FOR SELECT USING (bucket_id = 'culture-templates');

CREATE POLICY "Super admins can upload culture templates"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'culture-templates' AND public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete culture templates"
  ON storage.objects FOR DELETE USING (bucket_id = 'culture-templates' AND public.is_super_admin(auth.uid()));
