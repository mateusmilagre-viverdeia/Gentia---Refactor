
CREATE TABLE public.ai_prompts (
  key text PRIMARY KEY,
  label text NOT NULL,
  category text NOT NULL CHECK (category IN ('voice','evaluation')),
  description text,
  template text NOT NULL,
  default_template text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view ai_prompts"
  ON public.ai_prompts FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update ai_prompts"
  ON public.ai_prompts FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_ai_prompts_updated_at
  BEFORE UPDATE ON public.ai_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
