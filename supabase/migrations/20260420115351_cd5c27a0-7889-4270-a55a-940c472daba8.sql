-- Tabela de pesquisas NPS de candidatos
CREATE TABLE public.candidate_nps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.recruitment_jobs(id) ON DELETE SET NULL,
  application_id UUID REFERENCES public.recruitment_applications(id) ON DELETE SET NULL,
  
  score INTEGER CHECK (score >= 0 AND score <= 10),
  category TEXT CHECK (category IN ('promoter', 'neutral', 'detractor')),
  feedback_text TEXT,
  
  trigger TEXT NOT NULL CHECK (trigger IN ('exit', 'hired')),
  exit_stage TEXT,
  
  send_channel TEXT CHECK (send_channel IN ('whatsapp', 'email')),
  send_status TEXT NOT NULL DEFAULT 'pending' CHECK (send_status IN ('pending', 'sent', 'answered', 'expired', 'failed')),
  send_error TEXT,
  
  response_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  
  alert_resolved BOOLEAN NOT NULL DEFAULT false,
  alert_resolution_note TEXT,
  alert_resolved_at TIMESTAMPTZ,
  alert_resolved_by UUID,
  
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT candidate_nps_unique_per_trigger UNIQUE (candidate_id, job_id, trigger)
);

CREATE INDEX idx_candidate_nps_account ON public.candidate_nps(account_id);
CREATE INDEX idx_candidate_nps_candidate ON public.candidate_nps(candidate_id);
CREATE INDEX idx_candidate_nps_job ON public.candidate_nps(job_id);
CREATE INDEX idx_candidate_nps_send_status ON public.candidate_nps(send_status) WHERE send_status = 'pending';
CREATE INDEX idx_candidate_nps_pending_hired ON public.candidate_nps(scheduled_for) WHERE send_status = 'pending' AND trigger = 'hired';
CREATE INDEX idx_candidate_nps_token ON public.candidate_nps(response_token);
CREATE INDEX idx_candidate_nps_detractors ON public.candidate_nps(account_id, alert_resolved) WHERE category = 'detractor';

ALTER TABLE public.candidate_nps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view NPS"
ON public.candidate_nps FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = candidate_nps.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Account members can insert NPS"
ON public.candidate_nps FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = candidate_nps.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Account members can update NPS"
ON public.candidate_nps FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = candidate_nps.account_id
      AND am.user_id = auth.uid()
      AND am.is_active = true
  )
  OR public.is_super_admin(auth.uid())
);

CREATE TRIGGER update_candidate_nps_updated_at
BEFORE UPDATE ON public.candidate_nps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função RPC pública para responder NPS via token (sem auth)
CREATE OR REPLACE FUNCTION public.submit_nps_response(
  p_token TEXT,
  p_score INTEGER,
  p_feedback TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nps RECORD;
  v_category TEXT;
  v_account_name TEXT;
  v_job_title TEXT;
BEGIN
  IF p_score IS NULL OR p_score < 0 OR p_score > 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_score');
  END IF;

  SELECT * INTO v_nps FROM public.candidate_nps WHERE response_token = p_token;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END IF;
  
  IF v_nps.send_status = 'answered' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_answered');
  END IF;
  
  IF v_nps.send_status = 'expired' THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;
  
  v_category := CASE
    WHEN p_score >= 9 THEN 'promoter'
    WHEN p_score >= 7 THEN 'neutral'
    ELSE 'detractor'
  END;
  
  UPDATE public.candidate_nps
  SET 
    score = p_score,
    category = v_category,
    feedback_text = NULLIF(trim(p_feedback), ''),
    send_status = 'answered',
    answered_at = now()
  WHERE id = v_nps.id;
  
  -- Cria notificação de alerta para detratores
  IF v_category = 'detractor' THEN
    SELECT co.name, j.title 
    INTO v_account_name, v_job_title
    FROM public.companies co
    LEFT JOIN public.recruitment_jobs j ON j.id = v_nps.job_id
    WHERE co.id = v_nps.account_id;
    
    INSERT INTO public.notifications (
      account_id, user_id, type, priority, title, message, target_url, entity_type, entity_id, dedupe_key, metadata
    )
    SELECT
      v_nps.account_id,
      am.user_id,
      'nps_detractor_alert',
      'high',
      'Alerta NPS: candidato detrator',
      format('Candidato deu nota %s para o processo. Verifique o feedback.', p_score),
      format('/atracao-contratacao/recrutamento/analytics?tab=nps&detractor=%s', v_nps.id),
      'candidate_nps',
      v_nps.id,
      'nps_detractor:' || v_nps.id::text,
      jsonb_build_object('score', p_score, 'feedback', NULLIF(trim(p_feedback), ''), 'job_title', v_job_title)
    FROM public.account_members am
    WHERE am.account_id = v_nps.account_id
      AND am.is_active = true
      AND am.role IN ('owner', 'admin', 'admin_rh')
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'category', v_category,
    'score', p_score
  );
END;
$$;

-- Função RPC pública para buscar contexto da página de resposta (sem auth)
CREATE OR REPLACE FUNCTION public.get_nps_context(p_token TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'candidate_name', c.full_name,
    'job_title', COALESCE(j.title, 'Processo seletivo'),
    'consultancy_name', co.name,
    'trigger', n.trigger,
    'already_answered', (n.send_status = 'answered'),
    'score', n.score,
    'logo_url', cs.logo_url
  ) INTO v_result
  FROM public.candidate_nps n
  JOIN public.recruitment_candidates c ON c.id = n.candidate_id
  LEFT JOIN public.recruitment_jobs j ON j.id = n.job_id
  LEFT JOIN public.companies co ON co.id = n.account_id
  LEFT JOIN public.careers_page_settings cs ON cs.account_id = n.account_id
  WHERE n.response_token = p_token;
  
  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_nps_response(TEXT, INTEGER, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_nps_context(TEXT) TO anon, authenticated;