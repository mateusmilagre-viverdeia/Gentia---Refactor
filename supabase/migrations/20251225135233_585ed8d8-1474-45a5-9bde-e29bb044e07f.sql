-- Tabela principal de assessments
CREATE TABLE public.roip_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT '',
  company_size TEXT NOT NULL DEFAULT '',
  company_segment TEXT NOT NULL DEFAULT '',
  current_step INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  overall_score NUMERIC,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de respostas (cada pergunta)
CREATE TABLE public.roip_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roip_assessment_id UUID NOT NULL REFERENCES public.roip_assessments(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL,
  answer_value INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(roip_assessment_id, question_id)
);

-- Tabela de resultados finais
CREATE TABLE public.roip_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roip_assessment_id UUID NOT NULL UNIQUE REFERENCES public.roip_assessments(id) ON DELETE CASCADE,
  overall_score NUMERIC NOT NULL,
  pillar_scores JSONB NOT NULL,
  ai_analysis JSONB,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS em todas as tabelas
ALTER TABLE public.roip_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roip_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roip_results ENABLE ROW LEVEL SECURITY;

-- Políticas para roip_assessments (baseado em user_id)
CREATE POLICY "Users can view own roip assessments" ON public.roip_assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own roip assessments" ON public.roip_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own roip assessments" ON public.roip_assessments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own roip assessments" ON public.roip_assessments FOR DELETE USING (auth.uid() = user_id);

-- Políticas para roip_answers (via assessment)
CREATE POLICY "Users can view own roip answers" ON public.roip_answers FOR SELECT USING (EXISTS (SELECT 1 FROM roip_assessments WHERE roip_assessments.id = roip_answers.roip_assessment_id AND roip_assessments.user_id = auth.uid()));
CREATE POLICY "Users can insert own roip answers" ON public.roip_answers FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM roip_assessments WHERE roip_assessments.id = roip_answers.roip_assessment_id AND roip_assessments.user_id = auth.uid()));
CREATE POLICY "Users can update own roip answers" ON public.roip_answers FOR UPDATE USING (EXISTS (SELECT 1 FROM roip_assessments WHERE roip_assessments.id = roip_answers.roip_assessment_id AND roip_assessments.user_id = auth.uid()));
CREATE POLICY "Users can delete own roip answers" ON public.roip_answers FOR DELETE USING (EXISTS (SELECT 1 FROM roip_assessments WHERE roip_assessments.id = roip_answers.roip_assessment_id AND roip_assessments.user_id = auth.uid()));

-- Políticas para roip_results (via assessment)
CREATE POLICY "Users can view own roip results" ON public.roip_results FOR SELECT USING (EXISTS (SELECT 1 FROM roip_assessments WHERE roip_assessments.id = roip_results.roip_assessment_id AND roip_assessments.user_id = auth.uid()));
CREATE POLICY "Users can insert own roip results" ON public.roip_results FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM roip_assessments WHERE roip_assessments.id = roip_results.roip_assessment_id AND roip_assessments.user_id = auth.uid()));
CREATE POLICY "Users can update own roip results" ON public.roip_results FOR UPDATE USING (EXISTS (SELECT 1 FROM roip_assessments WHERE roip_assessments.id = roip_results.roip_assessment_id AND roip_assessments.user_id = auth.uid()));
CREATE POLICY "Users can delete own roip results" ON public.roip_results FOR DELETE USING (EXISTS (SELECT 1 FROM roip_assessments WHERE roip_assessments.id = roip_results.roip_assessment_id AND roip_assessments.user_id = auth.uid()));

-- Trigger para garantir apenas um assessment default por usuário
CREATE OR REPLACE FUNCTION public.ensure_single_default_roip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE roip_assessments 
    SET is_default = false 
    WHERE user_id = NEW.user_id 
    AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_single_default_roip_trigger
BEFORE INSERT OR UPDATE ON public.roip_assessments
FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_roip();

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_roip_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_roip_assessments_updated_at
BEFORE UPDATE ON public.roip_assessments
FOR EACH ROW EXECUTE FUNCTION public.update_roip_updated_at_column();

CREATE TRIGGER update_roip_answers_updated_at
BEFORE UPDATE ON public.roip_answers
FOR EACH ROW EXECUTE FUNCTION public.update_roip_updated_at_column();

CREATE TRIGGER update_roip_results_updated_at
BEFORE UPDATE ON public.roip_results
FOR EACH ROW EXECUTE FUNCTION public.update_roip_updated_at_column();