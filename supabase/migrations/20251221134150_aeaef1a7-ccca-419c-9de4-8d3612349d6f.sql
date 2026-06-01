-- =============================================
-- SISTEMA DE QUESTIONÁRIOS E PESQUISAS
-- =============================================

-- 1. Tabela de modelos de questionários
CREATE TABLE public.survey_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'satisfaction', 'engagement', 'values', 'performance', 'pulse', 'custom'
  is_public BOOLEAN DEFAULT FALSE, -- templates padrão da plataforma
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de perguntas dos modelos
CREATE TABLE public.survey_template_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.survey_templates(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL, -- 'single_choice', 'multiple_choice', 'text', 'scale', 'nps'
  options JSONB, -- para perguntas de múltipla escolha
  required BOOLEAN DEFAULT TRUE,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de questionários ativos
CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.survey_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'closed', 'archived'
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de perguntas do questionário
CREATE TABLE public.survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options JSONB,
  required BOOLEAN DEFAULT TRUE,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de respostas (sessão de resposta)
CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL,
  respondent_id UUID, -- NULL se anônimo
  is_anonymous BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de respostas individuais por pergunta
CREATE TABLE public.survey_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES public.survey_responses(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.survey_questions(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT,
  answer_options JSONB, -- para múltipla escolha
  answer_scale INTEGER, -- para escala/NPS
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de convites/envios
CREATE TABLE public.survey_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' -- 'pending', 'viewed', 'completed'
);

-- 8. Tabela de notificações internas
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'survey_invite', 'survey_reminder', 'badge_earned', etc.
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

CREATE INDEX idx_survey_templates_account ON public.survey_templates(account_id);
CREATE INDEX idx_survey_templates_public ON public.survey_templates(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_survey_template_questions_template ON public.survey_template_questions(template_id);
CREATE INDEX idx_surveys_account ON public.surveys(account_id);
CREATE INDEX idx_surveys_status ON public.surveys(status);
CREATE INDEX idx_survey_questions_survey ON public.survey_questions(survey_id);
CREATE INDEX idx_survey_responses_survey ON public.survey_responses(survey_id);
CREATE INDEX idx_survey_answers_response ON public.survey_answers(response_id);
CREATE INDEX idx_survey_invitations_survey ON public.survey_invitations(survey_id);
CREATE INDEX idx_survey_invitations_user ON public.survey_invitations(user_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- survey_templates policies
CREATE POLICY "Users can view own account templates"
  ON public.survey_templates FOR SELECT
  USING (
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
    OR is_public = TRUE
  );

CREATE POLICY "Users can create templates for own account"
  ON public.survey_templates FOR INSERT
  WITH CHECK (
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own account templates"
  ON public.survey_templates FOR UPDATE
  USING (
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own account templates"
  ON public.survey_templates FOR DELETE
  USING (
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  );

-- survey_template_questions policies
CREATE POLICY "Users can view template questions"
  ON public.survey_template_questions FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM public.survey_templates 
      WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
      OR is_public = TRUE
    )
  );

CREATE POLICY "Users can manage template questions"
  ON public.survey_template_questions FOR ALL
  USING (
    template_id IN (
      SELECT id FROM public.survey_templates 
      WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
    )
  );

-- surveys policies
CREATE POLICY "Users can view own account surveys"
  ON public.surveys FOR SELECT
  USING (
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create surveys for own account"
  ON public.surveys FOR INSERT
  WITH CHECK (
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own account surveys"
  ON public.surveys FOR UPDATE
  USING (
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own account surveys"
  ON public.surveys FOR DELETE
  USING (
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  );

-- survey_questions policies
CREATE POLICY "Users can view survey questions"
  ON public.survey_questions FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.surveys 
      WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage survey questions"
  ON public.survey_questions FOR ALL
  USING (
    survey_id IN (
      SELECT id FROM public.surveys 
      WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
    )
  );

-- survey_responses policies
CREATE POLICY "Users can view responses for own account surveys"
  ON public.survey_responses FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.surveys 
      WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
    )
    OR respondent_id = auth.uid()
  );

CREATE POLICY "Users can create responses"
  ON public.survey_responses FOR INSERT
  WITH CHECK (
    respondent_id = auth.uid() OR is_anonymous = TRUE
  );

CREATE POLICY "Users can update own responses"
  ON public.survey_responses FOR UPDATE
  USING (respondent_id = auth.uid());

-- survey_answers policies
CREATE POLICY "Users can view answers"
  ON public.survey_answers FOR SELECT
  USING (
    response_id IN (
      SELECT id FROM public.survey_responses 
      WHERE survey_id IN (
        SELECT id FROM public.surveys 
        WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
      )
      OR respondent_id = auth.uid()
    )
  );

CREATE POLICY "Users can create answers"
  ON public.survey_answers FOR INSERT
  WITH CHECK (
    response_id IN (
      SELECT id FROM public.survey_responses 
      WHERE respondent_id = auth.uid() OR is_anonymous = TRUE
    )
  );

-- survey_invitations policies
CREATE POLICY "Users can view invitations for own account surveys or own invitations"
  ON public.survey_invitations FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.surveys 
      WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can create invitations for own account surveys"
  ON public.survey_invitations FOR INSERT
  WITH CHECK (
    survey_id IN (
      SELECT id FROM public.surveys 
      WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own invitations or account invitations"
  ON public.survey_invitations FOR UPDATE
  USING (
    survey_id IN (
      SELECT id FROM public.surveys 
      WHERE account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
    )
    OR user_id = auth.uid()
  );

-- notifications policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (TRUE);

-- =============================================
-- TEMPLATES PADRÃO DA PLATAFORMA
-- =============================================

-- Template: Pesquisa de Satisfação do Time
INSERT INTO public.survey_templates (id, name, description, category, is_public, account_id)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Pesquisa de Satisfação do Time',
  'Avalie a satisfação geral da sua equipe com perguntas sobre ambiente, liderança e bem-estar.',
  'satisfaction',
  TRUE,
  NULL
);

INSERT INTO public.survey_template_questions (template_id, question_text, question_type, options, required, position)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'De modo geral, qual é o seu nível de satisfação trabalhando nesta empresa?', 'scale', '{"min": 1, "max": 5, "labels": {"1": "Muito insatisfeito", "5": "Muito satisfeito"}}', TRUE, 1),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Você se sente valorizado(a) pelo seu trabalho?', 'single_choice', '["Sempre", "Frequentemente", "Às vezes", "Raramente", "Nunca"]', TRUE, 2),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Como você avalia a comunicação da liderança?', 'scale', '{"min": 1, "max": 5, "labels": {"1": "Muito ruim", "5": "Excelente"}}', TRUE, 3),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Você recomendaria esta empresa como um bom lugar para trabalhar?', 'nps', '{"min": 0, "max": 10}', TRUE, 4),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'O que podemos fazer para melhorar sua experiência de trabalho?', 'text', NULL, FALSE, 5);

-- Template: Clima Organizacional
INSERT INTO public.survey_templates (id, name, description, category, is_public, account_id)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'Pesquisa de Clima Organizacional',
  'Avaliação completa do clima da empresa, incluindo cultura, comunicação e desenvolvimento.',
  'engagement',
  TRUE,
  NULL
);

INSERT INTO public.survey_template_questions (template_id, question_text, question_type, options, required, position)
VALUES
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Eu entendo claramente as metas e objetivos da empresa.', 'single_choice', '["Concordo totalmente", "Concordo", "Neutro", "Discordo", "Discordo totalmente"]', TRUE, 1),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Meu gestor fornece feedback construtivo regularmente.', 'single_choice', '["Concordo totalmente", "Concordo", "Neutro", "Discordo", "Discordo totalmente"]', TRUE, 2),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Tenho as ferramentas e recursos necessários para fazer meu trabalho.', 'single_choice', '["Concordo totalmente", "Concordo", "Neutro", "Discordo", "Discordo totalmente"]', TRUE, 3),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'A empresa promove um bom equilíbrio entre vida pessoal e profissional.', 'single_choice', '["Concordo totalmente", "Concordo", "Neutro", "Discordo", "Discordo totalmente"]', TRUE, 4),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Sinto que tenho oportunidades de crescimento profissional aqui.', 'single_choice', '["Concordo totalmente", "Concordo", "Neutro", "Discordo", "Discordo totalmente"]', TRUE, 5),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'A comunicação entre as equipes é eficiente.', 'scale', '{"min": 1, "max": 5, "labels": {"1": "Muito ruim", "5": "Excelente"}}', TRUE, 6),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Me sinto parte de um time colaborativo.', 'single_choice', '["Concordo totalmente", "Concordo", "Neutro", "Discordo", "Discordo totalmente"]', TRUE, 7),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'A empresa reconhece e recompensa bom desempenho.', 'single_choice', '["Concordo totalmente", "Concordo", "Neutro", "Discordo", "Discordo totalmente"]', TRUE, 8),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Qual nota você daria para o clima geral da empresa?', 'nps', '{"min": 0, "max": 10}', TRUE, 9),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'Compartilhe sugestões para melhorar o ambiente de trabalho:', 'text', NULL, FALSE, 10);

-- Template: Aderência aos Valores
INSERT INTO public.survey_templates (id, name, description, category, is_public, account_id)
VALUES (
  'c3d4e5f6-a7b8-9012-cdef-345678901234',
  'Pesquisa de Aderência aos Valores',
  'Avalie como os valores da empresa são vivenciados no dia a dia.',
  'values',
  TRUE,
  NULL
);

INSERT INTO public.survey_template_questions (template_id, question_text, question_type, options, required, position)
VALUES
  ('c3d4e5f6-a7b8-9012-cdef-345678901234', 'Os valores da empresa são claros para você?', 'single_choice', '["Muito claros", "Claros", "Parcialmente claros", "Pouco claros", "Não são claros"]', TRUE, 1),
  ('c3d4e5f6-a7b8-9012-cdef-345678901234', 'Você consegue identificar os valores no comportamento da liderança?', 'single_choice', '["Sempre", "Frequentemente", "Às vezes", "Raramente", "Nunca"]', TRUE, 2),
  ('c3d4e5f6-a7b8-9012-cdef-345678901234', 'Os valores são considerados nas decisões do dia a dia?', 'single_choice', '["Sempre", "Frequentemente", "Às vezes", "Raramente", "Nunca"]', TRUE, 3),
  ('c3d4e5f6-a7b8-9012-cdef-345678901234', 'Você se identifica com os valores da empresa?', 'scale', '{"min": 1, "max": 5, "labels": {"1": "Não me identifico", "5": "Me identifico totalmente"}}', TRUE, 4),
  ('c3d4e5f6-a7b8-9012-cdef-345678901234', 'Qual valor você considera mais forte na cultura atual?', 'text', NULL, FALSE, 5),
  ('c3d4e5f6-a7b8-9012-cdef-345678901234', 'Qual valor precisa ser mais desenvolvido?', 'text', NULL, FALSE, 6);

-- Template: Pesquisa de Pulso
INSERT INTO public.survey_templates (id, name, description, category, is_public, account_id)
VALUES (
  'd4e5f6a7-b8c9-0123-def0-456789012345',
  'Pesquisa de Pulso Semanal',
  'Pesquisa rápida para acompanhamento semanal do bem-estar da equipe.',
  'pulse',
  TRUE,
  NULL
);

INSERT INTO public.survey_template_questions (template_id, question_text, question_type, options, required, position)
VALUES
  ('d4e5f6a7-b8c9-0123-def0-456789012345', 'Como você está se sentindo esta semana?', 'single_choice', '["😊 Ótimo", "🙂 Bem", "😐 Normal", "😕 Não muito bem", "😢 Mal"]', TRUE, 1),
  ('d4e5f6a7-b8c9-0123-def0-456789012345', 'Seu nível de energia para o trabalho esta semana:', 'scale', '{"min": 1, "max": 5, "labels": {"1": "Muito baixo", "5": "Muito alto"}}', TRUE, 2),
  ('d4e5f6a7-b8c9-0123-def0-456789012345', 'Há algo que gostaria de compartilhar com a liderança?', 'text', NULL, FALSE, 3);

-- Template: Avaliação 360°
INSERT INTO public.survey_templates (id, name, description, category, is_public, account_id)
VALUES (
  'e5f6a7b8-c9d0-1234-ef01-567890123456',
  'Avaliação de Desempenho 360°',
  'Avaliação completa de competências e desempenho com múltiplas perspectivas.',
  'performance',
  TRUE,
  NULL
);

INSERT INTO public.survey_template_questions (template_id, question_text, question_type, options, required, position)
VALUES
  ('e5f6a7b8-c9d0-1234-ef01-567890123456', 'O colaborador demonstra comprometimento com os resultados.', 'scale', '{"min": 1, "max": 5, "labels": {"1": "Nunca", "5": "Sempre"}}', TRUE, 1),
  ('e5f6a7b8-c9d0-1234-ef01-567890123456', 'Colabora efetivamente com a equipe.', 'scale', '{"min": 1, "max": 5, "labels": {"1": "Nunca", "5": "Sempre"}}', TRUE, 2),
  ('e5f6a7b8-c9d0-1234-ef01-567890123456', 'Comunica-se de forma clara e assertiva.', 'scale', '{"min": 1, "max": 5, "labels": {"1": "Nunca", "5": "Sempre"}}', TRUE, 3),
  ('e5f6a7b8-c9d0-1234-ef01-567890123456', 'Busca constantemente melhorar seu desempenho.', 'scale', '{"min": 1, "max": 5, "labels": {"1": "Nunca", "5": "Sempre"}}', TRUE, 4),
  ('e5f6a7b8-c9d0-1234-ef01-567890123456', 'Demonstra alinhamento com os valores da empresa.', 'scale', '{"min": 1, "max": 5, "labels": {"1": "Nunca", "5": "Sempre"}}', TRUE, 5),
  ('e5f6a7b8-c9d0-1234-ef01-567890123456', 'Principais pontos fortes:', 'text', NULL, FALSE, 6),
  ('e5f6a7b8-c9d0-1234-ef01-567890123456', 'Principais pontos de desenvolvimento:', 'text', NULL, FALSE, 7),
  ('e5f6a7b8-c9d0-1234-ef01-567890123456', 'Nota geral de desempenho:', 'nps', '{"min": 0, "max": 10}', TRUE, 8);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_survey_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_survey_templates_updated_at
  BEFORE UPDATE ON public.survey_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_survey_updated_at();

CREATE TRIGGER update_surveys_updated_at
  BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_survey_updated_at();