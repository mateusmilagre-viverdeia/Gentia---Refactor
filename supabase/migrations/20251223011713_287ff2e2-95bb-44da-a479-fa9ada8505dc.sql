-- =============================================
-- DISC Assessment - Foundation Tables
-- =============================================

-- 1. Catálogo de perguntas DISC
CREATE TABLE public.disc_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dimension VARCHAR(1) NOT NULL CHECK (dimension IN ('D', 'I', 'S', 'C')),
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  is_reverse_scored BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Sessões de assessment DISC
CREATE TABLE public.disc_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.companies(id),
  user_id UUID NOT NULL,
  participant_name TEXT NOT NULL,
  participant_email TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Respostas do assessment
CREATE TABLE public.disc_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.disc_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.disc_questions(id),
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Resultados calculados
CREATE TABLE public.disc_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL UNIQUE REFERENCES public.disc_sessions(id) ON DELETE CASCADE,
  
  -- Scores brutos (soma das respostas por dimensão, 8-40 cada)
  d_score INTEGER NOT NULL,
  i_score INTEGER NOT NULL,
  s_score INTEGER NOT NULL,
  c_score INTEGER NOT NULL,
  
  -- Scores normalizados (0-100)
  d_normalized NUMERIC(5,2) NOT NULL,
  i_normalized NUMERIC(5,2) NOT NULL,
  s_normalized NUMERIC(5,2) NOT NULL,
  c_normalized NUMERIC(5,2) NOT NULL,
  
  -- Perfis identificados
  primary_profile VARCHAR(1) NOT NULL CHECK (primary_profile IN ('D', 'I', 'S', 'C')),
  secondary_profile VARCHAR(1) CHECK (secondary_profile IN ('D', 'I', 'S', 'C')),
  
  -- Intensidade do perfil primário (baixa, média, alta)
  intensity VARCHAR(10) NOT NULL CHECK (intensity IN ('baixa', 'média', 'alta')),
  
  -- Indica se há equilíbrio entre dimensões
  is_balanced BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- Índices para performance
-- =============================================
CREATE INDEX idx_disc_questions_dimension ON public.disc_questions(dimension);
CREATE INDEX idx_disc_sessions_account ON public.disc_sessions(account_id);
CREATE INDEX idx_disc_sessions_status ON public.disc_sessions(status);
CREATE INDEX idx_disc_responses_session ON public.disc_responses(session_id);
CREATE INDEX idx_disc_results_session ON public.disc_results(session_id);

-- Constraint única para evitar respostas duplicadas
CREATE UNIQUE INDEX idx_disc_responses_unique ON public.disc_responses(session_id, question_id);

-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE public.disc_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disc_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disc_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disc_results ENABLE ROW LEVEL SECURITY;

-- Perguntas: leitura pública (catálogo)
CREATE POLICY "Anyone can read active DISC questions"
  ON public.disc_questions FOR SELECT
  USING (is_active = true);

-- Sessões: membros da conta podem gerenciar
CREATE POLICY "Account members can view DISC sessions"
  ON public.disc_sessions FOR SELECT
  USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Account members can create DISC sessions"
  ON public.disc_sessions FOR INSERT
  WITH CHECK (is_account_member(auth.uid(), account_id));

CREATE POLICY "Account members can update DISC sessions"
  ON public.disc_sessions FOR UPDATE
  USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Account members can delete DISC sessions"
  ON public.disc_sessions FOR DELETE
  USING (is_account_member(auth.uid(), account_id));

-- Respostas: via sessão
CREATE POLICY "Users can manage responses for their sessions"
  ON public.disc_responses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM disc_sessions ds
      WHERE ds.id = disc_responses.session_id
      AND is_account_member(auth.uid(), ds.account_id)
    )
  );

-- Resultados: via sessão
CREATE POLICY "Users can view results for their sessions"
  ON public.disc_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM disc_sessions ds
      WHERE ds.id = disc_results.session_id
      AND is_account_member(auth.uid(), ds.account_id)
    )
  );

-- =============================================
-- Trigger para updated_at
-- =============================================
CREATE TRIGGER update_disc_sessions_updated_at
  BEFORE UPDATE ON public.disc_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Popular perguntas DISC (32 perguntas, 8 por dimensão)
-- =============================================
INSERT INTO public.disc_questions (dimension, question_number, question_text, is_reverse_scored) VALUES
-- Dimensão D (Dominância) - 8 perguntas
('D', 1, 'Eu gosto de assumir o controle em situações de grupo.', false),
('D', 2, 'Prefiro tomar decisões rapidamente, mesmo sob pressão.', false),
('D', 3, 'Sinto-me confortável em ambientes competitivos.', false),
('D', 4, 'Tenho facilidade em delegar tarefas para outras pessoas.', false),
('D', 5, 'Gosto de enfrentar desafios difíceis de frente.', false),
('D', 6, 'Costumo ir direto ao ponto nas conversas.', false),
('D', 7, 'Prefiro liderar do que seguir instruções de outros.', false),
('D', 8, 'Tenho alta tolerância a riscos quando busco resultados.', false),

-- Dimensão I (Influência) - 8 perguntas
('I', 1, 'Gosto de conhecer pessoas novas e fazer networking.', false),
('I', 2, 'Sou naturalmente otimista sobre a maioria das situações.', false),
('I', 3, 'Tenho facilidade em motivar e inspirar outras pessoas.', false),
('I', 4, 'Prefiro trabalhar em equipe do que sozinho.', false),
('I', 5, 'Gosto de ser o centro das atenções em eventos sociais.', false),
('I', 6, 'Expresso minhas emoções de forma aberta e espontânea.', false),
('I', 7, 'Tenho facilidade em convencer pessoas sobre minhas ideias.', false),
('I', 8, 'Valorizo muito o reconhecimento e feedback positivo.', false),

-- Dimensão S (Estabilidade) - 8 perguntas
('S', 1, 'Prefiro ambientes de trabalho estáveis e previsíveis.', false),
('S', 2, 'Sou uma pessoa paciente e sei esperar o momento certo.', false),
('S', 3, 'Valorizo muito a lealdade em relacionamentos.', false),
('S', 4, 'Prefiro evitar conflitos sempre que possível.', false),
('S', 5, 'Gosto de ajudar os outros sem esperar nada em troca.', false),
('S', 6, 'Tenho dificuldade em lidar com mudanças repentinas.', false),
('S', 7, 'Prefiro trabalhar em um ritmo constante e metódico.', false),
('S', 8, 'Sou uma pessoa confiável e cumpro minhas promessas.', false),

-- Dimensão C (Conformidade) - 8 perguntas
('C', 1, 'Presto muita atenção aos detalhes em tudo que faço.', false),
('C', 2, 'Prefiro seguir regras e procedimentos estabelecidos.', false),
('C', 3, 'Analiso todas as opções antes de tomar uma decisão.', false),
('C', 4, 'Valorizo precisão e qualidade acima de velocidade.', false),
('C', 5, 'Gosto de organizar informações de forma sistemática.', false),
('C', 6, 'Questiono dados e afirmações antes de aceitá-los.', false),
('C', 7, 'Prefiro trabalhar com fatos e lógica do que intuição.', false),
('C', 8, 'Tenho altos padrões de qualidade para mim e outros.', false);