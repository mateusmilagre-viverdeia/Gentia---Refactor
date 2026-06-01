-- Tabela de templates de scorecard
CREATE TABLE public.recruitment_scorecard_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  stage TEXT NOT NULL DEFAULT 'screening',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de critérios de avaliação
CREATE TABLE public.recruitment_scorecard_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.recruitment_scorecard_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  weight TEXT NOT NULL DEFAULT 'moderate',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de avaliações
CREATE TABLE public.recruitment_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.recruitment_applications(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.recruitment_scorecard_templates(id) ON DELETE SET NULL,
  evaluator_id UUID NOT NULL,
  stage TEXT NOT NULL,
  overall_score NUMERIC(3,1),
  recommendation TEXT CHECK (recommendation IN ('approve', 'reject', 'maybe')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de scores individuais por critério
CREATE TABLE public.recruitment_evaluation_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id UUID NOT NULL REFERENCES public.recruitment_evaluations(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES public.recruitment_scorecard_criteria(id) ON DELETE CASCADE,
  score NUMERIC(3,1) NOT NULL CHECK (score >= 0 AND score <= 10),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recruitment_scorecard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_scorecard_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_evaluation_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "Users can view scorecard templates from their account"
ON public.recruitment_scorecard_templates FOR SELECT
USING (
  account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can create scorecard templates for their account"
ON public.recruitment_scorecard_templates FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can update scorecard templates from their account"
ON public.recruitment_scorecard_templates FOR UPDATE
USING (
  account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can delete scorecard templates from their account"
ON public.recruitment_scorecard_templates FOR DELETE
USING (
  account_id IN (
    SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
  )
);

-- RLS Policies for criteria (via template)
CREATE POLICY "Users can view criteria from their templates"
ON public.recruitment_scorecard_criteria FOR SELECT
USING (
  template_id IN (
    SELECT id FROM public.recruitment_scorecard_templates WHERE account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Users can create criteria for their templates"
ON public.recruitment_scorecard_criteria FOR INSERT
WITH CHECK (
  template_id IN (
    SELECT id FROM public.recruitment_scorecard_templates WHERE account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Users can update criteria from their templates"
ON public.recruitment_scorecard_criteria FOR UPDATE
USING (
  template_id IN (
    SELECT id FROM public.recruitment_scorecard_templates WHERE account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Users can delete criteria from their templates"
ON public.recruitment_scorecard_criteria FOR DELETE
USING (
  template_id IN (
    SELECT id FROM public.recruitment_scorecard_templates WHERE account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

-- RLS Policies for evaluations (via application -> job -> account)
CREATE POLICY "Users can view evaluations from their account"
ON public.recruitment_evaluations FOR SELECT
USING (
  application_id IN (
    SELECT ra.id FROM public.recruitment_applications ra
    JOIN public.recruitment_jobs rj ON ra.job_id = rj.id
    WHERE rj.account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Users can create evaluations for their account"
ON public.recruitment_evaluations FOR INSERT
WITH CHECK (
  application_id IN (
    SELECT ra.id FROM public.recruitment_applications ra
    JOIN public.recruitment_jobs rj ON ra.job_id = rj.id
    WHERE rj.account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Users can update evaluations from their account"
ON public.recruitment_evaluations FOR UPDATE
USING (
  application_id IN (
    SELECT ra.id FROM public.recruitment_applications ra
    JOIN public.recruitment_jobs rj ON ra.job_id = rj.id
    WHERE rj.account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Users can delete evaluations from their account"
ON public.recruitment_evaluations FOR DELETE
USING (
  application_id IN (
    SELECT ra.id FROM public.recruitment_applications ra
    JOIN public.recruitment_jobs rj ON ra.job_id = rj.id
    WHERE rj.account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

-- RLS Policies for evaluation scores (via evaluation)
CREATE POLICY "Users can view evaluation scores from their account"
ON public.recruitment_evaluation_scores FOR SELECT
USING (
  evaluation_id IN (
    SELECT re.id FROM public.recruitment_evaluations re
    JOIN public.recruitment_applications ra ON re.application_id = ra.id
    JOIN public.recruitment_jobs rj ON ra.job_id = rj.id
    WHERE rj.account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Users can create evaluation scores for their account"
ON public.recruitment_evaluation_scores FOR INSERT
WITH CHECK (
  evaluation_id IN (
    SELECT re.id FROM public.recruitment_evaluations re
    JOIN public.recruitment_applications ra ON re.application_id = ra.id
    JOIN public.recruitment_jobs rj ON ra.job_id = rj.id
    WHERE rj.account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Users can update evaluation scores from their account"
ON public.recruitment_evaluation_scores FOR UPDATE
USING (
  evaluation_id IN (
    SELECT re.id FROM public.recruitment_evaluations re
    JOIN public.recruitment_applications ra ON re.application_id = ra.id
    JOIN public.recruitment_jobs rj ON ra.job_id = rj.id
    WHERE rj.account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Users can delete evaluation scores from their account"
ON public.recruitment_evaluation_scores FOR DELETE
USING (
  evaluation_id IN (
    SELECT re.id FROM public.recruitment_evaluations re
    JOIN public.recruitment_applications ra ON re.application_id = ra.id
    JOIN public.recruitment_jobs rj ON ra.job_id = rj.id
    WHERE rj.account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

-- Indexes for performance
CREATE INDEX idx_scorecard_templates_account ON public.recruitment_scorecard_templates(account_id);
CREATE INDEX idx_scorecard_criteria_template ON public.recruitment_scorecard_criteria(template_id);
CREATE INDEX idx_evaluations_application ON public.recruitment_evaluations(application_id);
CREATE INDEX idx_evaluations_evaluator ON public.recruitment_evaluations(evaluator_id);
CREATE INDEX idx_evaluation_scores_evaluation ON public.recruitment_evaluation_scores(evaluation_id);