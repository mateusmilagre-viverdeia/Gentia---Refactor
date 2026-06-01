
-- 1. Tabela account_settings (configurações por conta)
CREATE TABLE IF NOT EXISTS public.account_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  sla_meta_dias INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view account settings"
ON public.account_settings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.account_members am
  WHERE am.account_id = account_settings.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
));

CREATE POLICY "Admins can insert account settings"
ON public.account_settings FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.account_members am
  WHERE am.account_id = account_settings.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
    AND am.role IN ('owner', 'admin', 'admin_rh')
));

CREATE POLICY "Admins can update account settings"
ON public.account_settings FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.account_members am
  WHERE am.account_id = account_settings.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
    AND am.role IN ('owner', 'admin', 'admin_rh')
));

CREATE TRIGGER update_account_settings_updated_at
BEFORE UPDATE ON public.account_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Tabela recruitment_job_notes (histórico textual da vaga)
CREATE TABLE IF NOT EXISTS public.recruitment_job_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  author_id UUID,
  note_type TEXT NOT NULL DEFAULT 'manual',
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recruitment_job_notes_job ON public.recruitment_job_notes(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recruitment_job_notes_account ON public.recruitment_job_notes(account_id);

ALTER TABLE public.recruitment_job_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view job notes"
ON public.recruitment_job_notes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.account_members am
  WHERE am.account_id = recruitment_job_notes.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
));

CREATE POLICY "Members can insert job notes"
ON public.recruitment_job_notes FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.account_members am
  WHERE am.account_id = recruitment_job_notes.account_id
    AND am.user_id = auth.uid()
    AND am.is_active = true
));

CREATE POLICY "Authors can update their job notes"
ON public.recruitment_job_notes FOR UPDATE
USING (author_id = auth.uid());

CREATE POLICY "Authors can delete their job notes"
ON public.recruitment_job_notes FOR DELETE
USING (author_id = auth.uid());
