
CREATE TABLE public.consultant_satisfaction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  recurrence_days INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.consultant_satisfaction_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.consultant_satisfaction_templates(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('nps','stars','multiple_choice','text')),
  question_text TEXT NOT NULL,
  options JSONB,
  is_required BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_csq_template ON public.consultant_satisfaction_questions(template_id, order_index);

CREATE TABLE public.consultant_satisfaction_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  consultant_user_id UUID NOT NULL,
  client_account_id UUID NOT NULL,
  template_id UUID NOT NULL REFERENCES public.consultant_satisfaction_templates(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','expired')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','auto')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_csi_consultant ON public.consultant_satisfaction_invites(consultant_user_id);
CREATE INDEX idx_csi_account ON public.consultant_satisfaction_invites(client_account_id);
CREATE INDEX idx_csi_status ON public.consultant_satisfaction_invites(status);

CREATE TABLE public.consultant_satisfaction_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID NOT NULL REFERENCES public.consultant_satisfaction_invites(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.consultant_satisfaction_questions(id),
  value_numeric NUMERIC,
  value_text TEXT,
  value_options JSONB,
  respondent_name TEXT,
  respondent_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_csr_invite ON public.consultant_satisfaction_responses(invite_id);
CREATE INDEX idx_csr_question ON public.consultant_satisfaction_responses(question_id);

ALTER TABLE public.consultant_satisfaction_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_satisfaction_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_satisfaction_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_satisfaction_responses ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_satisfaction_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'super_admin')
      OR public.has_role(_user_id, 'head_cs');
$$;

CREATE POLICY "satisfaction admins manage templates"
ON public.consultant_satisfaction_templates FOR ALL
USING (public.is_satisfaction_admin(auth.uid()))
WITH CHECK (public.is_satisfaction_admin(auth.uid()));

CREATE POLICY "public can read active templates"
ON public.consultant_satisfaction_templates FOR SELECT
USING (is_active = true);

CREATE POLICY "satisfaction admins manage questions"
ON public.consultant_satisfaction_questions FOR ALL
USING (public.is_satisfaction_admin(auth.uid()))
WITH CHECK (public.is_satisfaction_admin(auth.uid()));

CREATE POLICY "public can read active template questions"
ON public.consultant_satisfaction_questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.consultant_satisfaction_templates t
    WHERE t.id = template_id AND t.is_active = true
  )
);

CREATE POLICY "satisfaction admins manage invites"
ON public.consultant_satisfaction_invites FOR ALL
USING (public.is_satisfaction_admin(auth.uid()))
WITH CHECK (public.is_satisfaction_admin(auth.uid()));

CREATE POLICY "consultant reads own invites"
ON public.consultant_satisfaction_invites FOR SELECT
USING (consultant_user_id = auth.uid());

CREATE POLICY "public can read invite by token"
ON public.consultant_satisfaction_invites FOR SELECT
USING (true);

CREATE POLICY "public can mark invite completed"
ON public.consultant_satisfaction_invites FOR UPDATE
USING (status = 'pending' AND expires_at > now())
WITH CHECK (status IN ('pending','completed'));

CREATE POLICY "satisfaction admins read responses"
ON public.consultant_satisfaction_responses FOR SELECT
USING (public.is_satisfaction_admin(auth.uid()));

CREATE POLICY "consultant reads own responses"
ON public.consultant_satisfaction_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.consultant_satisfaction_invites i
    WHERE i.id = invite_id AND i.consultant_user_id = auth.uid()
  )
);

CREATE POLICY "public can submit responses for pending invite"
ON public.consultant_satisfaction_responses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.consultant_satisfaction_invites i
    WHERE i.id = invite_id
      AND i.status = 'pending'
      AND i.expires_at > now()
  )
);

CREATE OR REPLACE FUNCTION public.notify_low_satisfaction_score()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  q_type TEXT;
  invite_row public.consultant_satisfaction_invites%ROWTYPE;
  is_low BOOLEAN := false;
BEGIN
  SELECT type INTO q_type FROM public.consultant_satisfaction_questions WHERE id = NEW.question_id;
  SELECT * INTO invite_row FROM public.consultant_satisfaction_invites WHERE id = NEW.invite_id;

  IF q_type = 'nps' AND NEW.value_numeric IS NOT NULL AND NEW.value_numeric <= 6 THEN
    is_low := true;
  ELSIF q_type = 'stars' AND NEW.value_numeric IS NOT NULL AND NEW.value_numeric <= 2 THEN
    is_low := true;
  END IF;

  IF is_low THEN
    BEGIN
      INSERT INTO public.notifications (user_id, type, title, message, metadata)
      SELECT ur.user_id,
             'satisfaction_low_score',
             'Avaliação baixa recebida',
             'Um cliente registrou uma nota baixa para um consultor.',
             jsonb_build_object(
               'invite_id', NEW.invite_id,
               'consultant_user_id', invite_row.consultant_user_id,
               'client_account_id', invite_row.client_account_id,
               'question_type', q_type,
               'value', NEW.value_numeric
             )
      FROM public.user_roles ur
      WHERE ur.role::text IN ('super_admin','head_cs');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_low_satisfaction
AFTER INSERT ON public.consultant_satisfaction_responses
FOR EACH ROW EXECUTE FUNCTION public.notify_low_satisfaction_score();

CREATE TRIGGER trg_satisfaction_templates_updated
BEFORE UPDATE ON public.consultant_satisfaction_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
