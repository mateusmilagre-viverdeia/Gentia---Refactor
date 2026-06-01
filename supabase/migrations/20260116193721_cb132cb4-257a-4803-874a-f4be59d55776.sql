-- Tabela de notas internas de recrutamento
CREATE TABLE public.recruitment_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL,
  application_id UUID REFERENCES public.recruitment_applications(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de templates de email
CREATE TABLE public.recruitment_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_recruitment_notes_candidate ON public.recruitment_notes(candidate_id);
CREATE INDEX idx_recruitment_notes_account ON public.recruitment_notes(account_id);
CREATE INDEX idx_recruitment_notes_application ON public.recruitment_notes(application_id);
CREATE INDEX idx_recruitment_templates_account ON public.recruitment_email_templates(account_id);
CREATE INDEX idx_recruitment_templates_type ON public.recruitment_email_templates(type);

-- Trigger para updated_at
CREATE TRIGGER update_recruitment_notes_updated_at
  BEFORE UPDATE ON public.recruitment_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recruitment_email_templates_updated_at
  BEFORE UPDATE ON public.recruitment_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.recruitment_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_email_templates ENABLE ROW LEVEL SECURITY;

-- Policies para recruitment_notes
CREATE POLICY "Users can view notes in their account"
  ON public.recruitment_notes FOR SELECT
  USING (
    is_account_member(auth.uid(), account_id) OR 
    can_edit_client_project(auth.uid(), account_id)
  );

CREATE POLICY "Users can insert notes in their account"
  ON public.recruitment_notes FOR INSERT
  WITH CHECK (
    is_account_member(auth.uid(), account_id) OR 
    can_edit_client_project(auth.uid(), account_id)
  );

CREATE POLICY "Users can update own notes"
  ON public.recruitment_notes FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own notes"
  ON public.recruitment_notes FOR DELETE
  USING (created_by = auth.uid());

-- Policies para recruitment_email_templates
CREATE POLICY "Users can view templates in their account"
  ON public.recruitment_email_templates FOR SELECT
  USING (
    is_account_member(auth.uid(), account_id) OR 
    can_edit_client_project(auth.uid(), account_id)
  );

CREATE POLICY "Users can insert templates in their account"
  ON public.recruitment_email_templates FOR INSERT
  WITH CHECK (
    is_account_member(auth.uid(), account_id) OR 
    can_edit_client_project(auth.uid(), account_id)
  );

CREATE POLICY "Users can update templates in their account"
  ON public.recruitment_email_templates FOR UPDATE
  USING (
    is_account_member(auth.uid(), account_id) OR 
    can_edit_client_project(auth.uid(), account_id)
  );

CREATE POLICY "Users can delete templates in their account"
  ON public.recruitment_email_templates FOR DELETE
  USING (
    is_account_member(auth.uid(), account_id) OR 
    can_edit_client_project(auth.uid(), account_id)
  );