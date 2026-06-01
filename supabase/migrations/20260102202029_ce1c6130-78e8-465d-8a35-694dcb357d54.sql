-- Tabela de perguntas QA
CREATE TABLE public.qa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_number INT NOT NULL,
  event_description TEXT NOT NULL,
  dimension CHAR(1) NOT NULL CHECK (dimension IN ('C', 'R', 'A', 'D')),
  question_text TEXT NOT NULL,
  scale_low_label TEXT NOT NULL,
  scale_high_label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de sessões QA
CREATE TABLE public.qa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  participant_name TEXT NOT NULL,
  participant_email TEXT,
  team_id UUID REFERENCES public.pulse_teams(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de respostas QA
CREATE TABLE public.qa_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.qa_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.qa_questions(id),
  score INT NOT NULL CHECK (score >= 1 AND score <= 5),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de resultados QA
CREATE TABLE public.qa_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.qa_sessions(id) ON DELETE CASCADE,
  c_score INT NOT NULL,
  r_score INT NOT NULL,
  a_score INT NOT NULL,
  d_score INT NOT NULL,
  qa_total INT NOT NULL,
  profile TEXT NOT NULL CHECK (profile IN ('alpinista', 'campista', 'desistente')),
  profile_level TEXT NOT NULL CHECK (profile_level IN ('alto', 'moderadamente_alto', 'moderado', 'moderadamente_baixo', 'baixo')),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT qa_results_session_unique UNIQUE (session_id)
);

-- Índices
CREATE INDEX idx_qa_sessions_account ON public.qa_sessions(account_id);
CREATE INDEX idx_qa_sessions_user ON public.qa_sessions(user_id);
CREATE INDEX idx_qa_sessions_status ON public.qa_sessions(status);
CREATE INDEX idx_qa_responses_session ON public.qa_responses(session_id);
CREATE INDEX idx_qa_results_session ON public.qa_results(session_id);
CREATE INDEX idx_qa_results_profile ON public.qa_results(profile);

-- RLS para qa_questions (leitura pública, escrita admin)
ALTER TABLE public.qa_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perguntas QA são visíveis para todos autenticados"
ON public.qa_questions FOR SELECT
TO authenticated
USING (true);

-- RLS para qa_sessions
ALTER TABLE public.qa_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias sessões QA"
ON public.qa_sessions FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
);

CREATE POLICY "Usuários podem criar suas próprias sessões QA"
ON public.qa_sessions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar suas próprias sessões QA"
ON public.qa_sessions FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- RLS para qa_responses
ALTER TABLE public.qa_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver respostas de suas sessões QA"
ON public.qa_responses FOR SELECT
TO authenticated
USING (
  session_id IN (
    SELECT id FROM public.qa_sessions 
    WHERE user_id = auth.uid() OR 
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Usuários podem inserir respostas em suas sessões QA"
ON public.qa_responses FOR INSERT
TO authenticated
WITH CHECK (
  session_id IN (SELECT id FROM public.qa_sessions WHERE user_id = auth.uid())
);

-- RLS para qa_results
ALTER TABLE public.qa_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver resultados de suas sessões QA"
ON public.qa_results FOR SELECT
TO authenticated
USING (
  session_id IN (
    SELECT id FROM public.qa_sessions 
    WHERE user_id = auth.uid() OR 
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Usuários podem inserir resultados em suas sessões QA"
ON public.qa_results FOR INSERT
TO authenticated
WITH CHECK (
  session_id IN (SELECT id FROM public.qa_sessions WHERE user_id = auth.uid())
);

-- Seed: 20 eventos adversos com perguntas CRAD (baseado no PDF)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label) VALUES
-- Evento 1
(1, 'Você sofre um revés financeiro.', 'C', 'Até que ponto você pode influenciar esta situação?', 'Não muito', 'Completamente'),
(1, 'Você sofre um revés financeiro.', 'D', 'A consequência dessa situação irá:', 'Durar para sempre', 'Passar rapidamente'),
-- Evento 2
(2, 'Você é preterido numa promoção.', 'R', 'Até que ponto você mantém-se responsável em melhorar esta situação?', 'Não completamente responsável', 'Completamente responsável'),
(2, 'Você é preterido numa promoção.', 'A', 'A consequência dessa situação irá:', 'Afetar todos aspectos da vida', 'Ser limitada a esta situação'),
-- Evento 3
(3, 'Você recebe crítica construtiva sobre seu trabalho.', 'C', 'Até que ponto você pode influenciar o que foi dito?', 'Não muito', 'Completamente'),
(3, 'Você recebe crítica construtiva sobre seu trabalho.', 'D', 'Por quanto tempo você será afetado pela crítica?', 'Para sempre', 'Muito brevemente'),
-- Evento 4
(4, 'Um projeto importante é cancelado.', 'R', 'Até que ponto você mantém-se responsável por resolver a situação?', 'Não completamente responsável', 'Completamente responsável'),
(4, 'Um projeto importante é cancelado.', 'A', 'A consequência do cancelamento irá:', 'Afetar todos aspectos do trabalho', 'Ser limitada a este projeto'),
-- Evento 5
(5, 'Você tem um conflito sério com um colega de trabalho.', 'C', 'Até que ponto você pode influenciar a resolução?', 'Não muito', 'Completamente'),
(5, 'Você tem um conflito sério com um colega de trabalho.', 'D', 'Por quanto tempo isso irá afetar seu trabalho?', 'Para sempre', 'Muito brevemente'),
-- Evento 6
(6, 'Seu chefe discorda publicamente de você numa reunião.', 'R', 'Até que ponto você se responsabiliza por melhorar a relação?', 'Não completamente responsável', 'Completamente responsável'),
(6, 'Seu chefe discorda publicamente de você numa reunião.', 'A', 'A consequência dessa situação irá:', 'Afetar todos aspectos profissionais', 'Ser limitada a esta reunião'),
-- Evento 7
(7, 'Você perde um cliente importante.', 'C', 'Até que ponto você pode influenciar a recuperação?', 'Não muito', 'Completamente'),
(7, 'Você perde um cliente importante.', 'D', 'O impacto dessa perda irá:', 'Durar para sempre', 'Passar rapidamente'),
-- Evento 8
(8, 'Você comete um erro que afeta a equipe.', 'R', 'Até que ponto você se responsabiliza por corrigir?', 'Não completamente responsável', 'Completamente responsável'),
(8, 'Você comete um erro que afeta a equipe.', 'A', 'A consequência do erro irá:', 'Afetar todos aspectos do trabalho', 'Ser limitada a esta tarefa'),
-- Evento 9
(9, 'Sua carga de trabalho aumenta significativamente.', 'C', 'Até que ponto você pode influenciar sua carga?', 'Não muito', 'Completamente'),
(9, 'Sua carga de trabalho aumenta significativamente.', 'D', 'Por quanto tempo essa sobrecarga irá durar?', 'Para sempre', 'Muito brevemente'),
-- Evento 10
(10, 'Você não atinge uma meta importante.', 'R', 'Até que ponto você se responsabiliza por melhorar?', 'Não completamente responsável', 'Completamente responsável'),
(10, 'Você não atinge uma meta importante.', 'A', 'O não cumprimento da meta irá:', 'Afetar todos aspectos da carreira', 'Ser limitado a esta meta'),
-- Evento 11
(11, 'Mudanças organizacionais afetam sua posição.', 'C', 'Até que ponto você pode influenciar sua posição?', 'Não muito', 'Completamente'),
(11, 'Mudanças organizacionais afetam sua posição.', 'D', 'O impacto dessas mudanças irá:', 'Durar para sempre', 'Passar rapidamente'),
-- Evento 12
(12, 'Você não consegue equilibrar trabalho e vida pessoal.', 'R', 'Até que ponto você se responsabiliza por encontrar equilíbrio?', 'Não completamente responsável', 'Completamente responsável'),
(12, 'Você não consegue equilibrar trabalho e vida pessoal.', 'A', 'O desequilíbrio irá:', 'Afetar todos aspectos da vida', 'Ser limitado ao momento atual'),
-- Evento 13
(13, 'Uma tecnologia que você domina se torna obsoleta.', 'C', 'Até que ponto você pode influenciar sua atualização?', 'Não muito', 'Completamente'),
(13, 'Uma tecnologia que você domina se torna obsoleta.', 'D', 'O impacto dessa obsolescência irá:', 'Durar para sempre', 'Passar rapidamente'),
-- Evento 14
(14, 'Você recebe feedback negativo de um subordinado.', 'R', 'Até que ponto você se responsabiliza por melhorar?', 'Não completamente responsável', 'Completamente responsável'),
(14, 'Você recebe feedback negativo de um subordinado.', 'A', 'O impacto desse feedback irá:', 'Afetar todos aspectos da liderança', 'Ser limitado a este relacionamento'),
-- Evento 15
(15, 'Um prazo importante é antecipado inesperadamente.', 'C', 'Até que ponto você pode influenciar a entrega?', 'Não muito', 'Completamente'),
(15, 'Um prazo importante é antecipado inesperadamente.', 'D', 'O estresse dessa antecipação irá:', 'Durar para sempre', 'Passar rapidamente'),
-- Evento 16
(16, 'Você é excluído de uma decisão importante.', 'R', 'Até que ponto você se responsabiliza por mudar isso?', 'Não completamente responsável', 'Completamente responsável'),
(16, 'Você é excluído de uma decisão importante.', 'A', 'A exclusão irá:', 'Afetar todos aspectos profissionais', 'Ser limitada a esta decisão'),
-- Evento 17
(17, 'Recursos prometidos para seu projeto são cortados.', 'C', 'Até que ponto você pode influenciar a situação?', 'Não muito', 'Completamente'),
(17, 'Recursos prometidos para seu projeto são cortados.', 'D', 'O impacto desse corte irá:', 'Durar para sempre', 'Passar rapidamente'),
-- Evento 18
(18, 'Um membro-chave da sua equipe pede demissão.', 'R', 'Até que ponto você se responsabiliza por resolver?', 'Não completamente responsável', 'Completamente responsável'),
(18, 'Um membro-chave da sua equipe pede demissão.', 'A', 'O impacto da saída irá:', 'Afetar todos aspectos do projeto', 'Ser limitado a esta posição'),
-- Evento 19
(19, 'Você enfrenta resistência a uma ideia inovadora.', 'C', 'Até que ponto você pode influenciar a aceitação?', 'Não muito', 'Completamente'),
(19, 'Você enfrenta resistência a uma ideia inovadora.', 'D', 'A resistência irá:', 'Durar para sempre', 'Passar rapidamente'),
-- Evento 20
(20, 'Você descobre que um colega falou mal de você.', 'R', 'Até que ponto você se responsabiliza por resolver?', 'Não completamente responsável', 'Completamente responsável'),
(20, 'Você descobre que um colega falou mal de você.', 'A', 'O impacto dessa situação irá:', 'Afetar todos aspectos profissionais', 'Ser limitado a esta pessoa');