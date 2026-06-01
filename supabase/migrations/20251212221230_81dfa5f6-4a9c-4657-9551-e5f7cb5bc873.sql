-- Create sessions table
CREATE TABLE public.values_questions_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  stage INTEGER DEFAULT 0,
  working_values JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.values_questions_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for sessions
CREATE POLICY "Members can view account sessions" ON public.values_questions_sessions
  FOR SELECT USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());

CREATE POLICY "Members can create account sessions" ON public.values_questions_sessions
  FOR INSERT WITH CHECK (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());

CREATE POLICY "Members can update account sessions" ON public.values_questions_sessions
  FOR UPDATE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());

CREATE POLICY "Members can delete account sessions" ON public.values_questions_sessions
  FOR DELETE USING (is_account_member(auth.uid(), account_id) OR user_id = auth.uid());

-- Create items table
CREATE TABLE public.values_questions_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.values_questions_sessions(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,
  value_label TEXT,
  question_text TEXT NOT NULL,
  source TEXT DEFAULT 'catalog',
  position INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.values_questions_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for items
CREATE POLICY "Users can manage items through session" ON public.values_questions_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.values_questions_sessions s
      WHERE s.id = values_questions_items.session_id
      AND (is_account_member(auth.uid(), s.account_id) OR s.user_id = auth.uid())
    )
  );

-- Create catalog table
CREATE TABLE public.values_questions_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_number INTEGER NOT NULL,
  value_label TEXT,
  question_text TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.values_questions_catalog ENABLE ROW LEVEL SECURITY;

-- RLS policy for catalog (public read)
CREATE POLICY "Anyone can read active catalog" ON public.values_questions_catalog
  FOR SELECT USING (active = true);

-- Create version history table
CREATE TABLE public.values_questions_version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.values_questions_sessions(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  variant TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.values_questions_version_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for version history
CREATE POLICY "Members can manage version history" ON public.values_questions_version_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.values_questions_sessions s
      WHERE s.id = values_questions_version_history.session_id
      AND (is_account_member(auth.uid(), s.account_id) OR s.user_id = auth.uid())
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_values_questions_sessions_updated_at
  BEFORE UPDATE ON public.values_questions_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Populate catalog with Stage 1 - Perguntas Iniciais (7 questions)
INSERT INTO public.values_questions_catalog (stage_number, question_text) VALUES
(1, 'Nome'),
(1, 'Telefone'),
(1, 'Idade'),
(1, 'Formação'),
(1, 'E-mail'),
(1, 'Onde você mora atualmente?'),
(1, 'Tem disponibilidade de morar e trabalhar em São Paulo Capital?');

-- Populate catalog with Stage 2 - Coringas Iniciais (12 questions)
INSERT INTO public.values_questions_catalog (stage_number, question_text) VALUES
(2, 'Me conta um pouco da tua história, de forma bem resumida (família, vida pessoal, infância até os dias atuais)'),
(2, 'Qual vaga você gostaria de aplicar?'),
(2, 'Qual é a sua experiência e resultados mais importante que você teve nessa área que você acabou de aplicar para trabalhar conosco?'),
(2, 'Como você se considera nesta vaga que acabou de aplicar? (Junior, pleno, senior ou expert/lider)'),
(2, 'Você está trabalhando atualmente?'),
(2, 'Me fala o nome das suas ultimas 3 empresas no qual trabalhou…'),
(2, 'O que fez você aplicar para trabalhar conosco?'),
(2, 'Qual parte do seu curriculo e da sua historia você tem mais orgulho?'),
(2, 'Tirando sua família, sua saúde, seu trabalho e/ou Deus... Quais são as coisas mais importante da vida, na sua opinião? Como você reconhece o valor delas no seu dia-a-dia?'),
(2, 'Tirando falta de valores éticos e morais, desrespeito, racismo, preconceito... Me fala o máximo de coisas que você considera como intolerável na sua vida?'),
(2, 'Como você costuma aumentar e manter o seu nível de energia alto?'),
(2, 'Qual é a relação do esporte na sua vida?');

-- Populate catalog with Stage 4 - Coringas Finais (11 questions)
INSERT INTO public.values_questions_catalog (stage_number, question_text) VALUES
(4, 'Qual foi a EMPRESA que você mais gostou de trabalhar? Por que você gostava tanto deste ambiente de trabalho? Ps.: Me fala o nome da empresa e as características que faziam dali o melhor lugar que você gostou de trabalhar'),
(4, 'E qual foi a EMPRESA que você menos gostou de trabalhar e por que? Ps.: Me fala o nome da empresa e as características que faziam dali o PIOR lugar que você gostou de trabalhar'),
(4, 'No seu dia a dia você tem situações que são seu melhor momento, quais são esses melhores momentos?'),
(4, 'O que você SONHA ao vir trabalhar aqui que te deixaria muito feliz e com a energia muito alta e engajada?'),
(4, 'E o pior momento?'),
(4, 'O que tem sido sua maior realização no trabalho?'),
(4, 'O que você espera ao vir trabalhar aqui?'),
(4, 'O que você gostaria de alcançar aqui em seus primeiros seis meses?'),
(4, 'Tirando família e valores éticos e morais como Honestidade, Integridade, respeito, ética... Quais são seus 5 VALORES que você considera como não negociáveis na sua vida?'),
(4, 'O que valeu a pena ao responder este questionário?');

-- Populate catalog with Stage 3 - Perguntas por Valor (from .txt file)
-- Gratidão
INSERT INTO public.values_questions_catalog (stage_number, value_label, question_text) VALUES
(3, 'Gratidão', 'Escreva o máximo de coisas possíveis a que ou a quem você é grato na vida? Explique um pouco de cada.');

-- Resultado e Equilíbrio
INSERT INTO public.values_questions_catalog (stage_number, value_label, question_text) VALUES
(3, 'Resultado', 'Para você, o que significa equilíbrio entre vida pessoal e profissional?'),
(3, 'Resultado', 'Descreva uma situação em que você precisou abrir mão de algo importante para alcançar um objetivo no trabalho. Como você equilibrou isso?'),
(3, 'Resultado', 'Qual foi o maior resultado que você alcançou e o que você precisou sacrificar para isso?'),
(3, 'Resultado', 'Você tem clareza do que quer alcançar na sua carreira nos próximos 5 anos? Como pretende chegar lá?');

-- Mentalidade de Crescimento / Melhoria Contínua / Desenvolvimento
INSERT INTO public.values_questions_catalog (stage_number, value_label, question_text) VALUES
(3, 'Melhoria Contínua', 'O que você está fazendo atualmente para se desenvolver profissionalmente?'),
(3, 'Melhoria Contínua', 'Como você reage quando percebe que cometeu um erro ou que existe uma forma melhor de fazer algo?'),
(3, 'Melhoria Contínua', 'Conte uma situação em que você precisou aprender algo completamente novo para realizar uma tarefa. Como você lidou com isso?'),
(3, 'Melhoria Contínua', 'Você tem o hábito de ler, fazer cursos ou buscar feedbacks? Dê exemplos recentes.'),
(3, 'Melhoria Contínua', 'Qual foi a crítica mais difícil que você já recebeu? O que fez com ela?');

-- Jogar o jogo abertamente (Transparência com Respeito)
INSERT INTO public.values_questions_catalog (stage_number, value_label, question_text) VALUES
(3, 'Transparência', 'Você prefere dar feedbacks diretamente ou evitar conflitos? Por quê?'),
(3, 'Transparência', 'Conte um momento em que você precisou ser honesto mesmo sabendo que poderia gerar desconforto.'),
(3, 'Transparência', 'Como você lida quando percebe que alguém da equipe não está sendo totalmente transparente?'),
(3, 'Transparência', 'Descreva uma situação em que você discordou do seu líder. O que você fez?'),
(3, 'Transparência', 'Se você visse um colega cometendo uma falha grave, como agiria?');

-- Liberdade com Responsabilidade
INSERT INTO public.values_questions_catalog (stage_number, value_label, question_text) VALUES
(3, 'Liberdade', 'Você prefere ter tarefas bem definidas ou liberdade para decidir como fazer? Por quê?'),
(3, 'Liberdade', 'Conte um exemplo em que você teve autonomia total para entregar algo importante. Como foi essa experiência?'),
(3, 'Liberdade', 'Você já teve uma situação em que abusaram da liberdade que você deu ou que recebeu? O que você aprendeu?'),
(3, 'Liberdade', 'Como você garante que a liberdade não se torne falta de comprometimento?'),
(3, 'Liberdade', 'Como você organiza suas prioridades quando ninguém está cobrando diretamente?'),
(3, 'Liberdade', 'Você se considera mais autogerenciável ou prefere ter alguém supervisionando seu trabalho?'),
(3, 'Liberdade', 'Quando você tem liberdade para trabalhar, como você define seus próprios limites?');

-- O Cliente é REI / Satisfação do Cliente
INSERT INTO public.values_questions_catalog (stage_number, value_label, question_text) VALUES
(3, 'Satisfação do Cliente', 'Descreva uma situação em que você foi além do esperado para ajudar um cliente.'),
(3, 'Satisfação do Cliente', 'Qual foi a reclamação mais difícil que você já recebeu de um cliente? O que você fez?'),
(3, 'Satisfação do Cliente', 'Para você, o que diferencia um atendimento bom de um atendimento excelente?'),
(3, 'Satisfação do Cliente', 'Você já teve que dizer "não" a um cliente? Como você fez isso?');

-- Ética
INSERT INTO public.values_questions_catalog (stage_number, value_label, question_text) VALUES
(3, 'Ética', 'Você já presenciou uma situação antiética no trabalho? O que você fez?'),
(3, 'Ética', 'Se você perceber que uma meta só pode ser batida de forma questionável, o que você faria?'),
(3, 'Ética', 'Você já teve que abrir mão de uma oportunidade por questões éticas? Conte.'),
(3, 'Ética', 'Como você lida quando a cultura de uma empresa entra em conflito com seus próprios valores?');

-- Senso de Dono / Atitude de Dono / Comprometimento
INSERT INTO public.values_questions_catalog (stage_number, value_label, question_text) VALUES
(3, 'Senso de Dono', 'Você se considera uma pessoa que vai além do que é pedido? Dê um exemplo.'),
(3, 'Senso de Dono', 'Se você perceber um problema que não é da sua área, o que você faz?'),
(3, 'Senso de Dono', 'O que significa "vestir a camisa" da empresa para você?');

-- Trabalho em Equipe / Colaboração / Família
INSERT INTO public.values_questions_catalog (stage_number, value_label, question_text) VALUES
(3, 'Trabalho em Equipe', 'Descreva uma situação em que você precisou colaborar com alguém com quem tinha dificuldade de relacionamento.'),
(3, 'Trabalho em Equipe', 'Você prefere trabalhar sozinho ou em grupo? Por quê?'),
(3, 'Trabalho em Equipe', 'Como você lida quando um colega não está entregando sua parte no projeto?'),
(3, 'Trabalho em Equipe', 'Como você contribui para o clima positivo em uma equipe?'),
(3, 'Trabalho em Equipe', 'O que significa "família" dentro de um ambiente de trabalho para você?'),
(3, 'Trabalho em Equipe', 'Você já ajudou um colega em dificuldade mesmo sem ser sua obrigação? Como foi?'),
(3, 'Trabalho em Equipe', 'Como você reage quando percebe que há competição tóxica dentro da equipe?');

-- Inovação / Criatividade
INSERT INTO public.values_questions_catalog (stage_number, value_label, question_text) VALUES
(3, 'Inovação', 'Conte um exemplo de uma ideia inovadora que você sugeriu ou implementou.'),
(3, 'Inovação', 'Como você reage quando suas ideias são rejeitadas?'),
(3, 'Inovação', 'Você costuma propor novas formas de fazer as coisas ou prefere seguir processos estabelecidos?'),
(3, 'Inovação', 'O que te motiva mais: melhorar processos ou criar algo novo?');

-- Resiliência
INSERT INTO public.values_questions_catalog (stage_number, value_label, question_text) VALUES
(3, 'Resiliência', 'Conte um momento em que você enfrentou uma grande dificuldade no trabalho. O que aprendeu?'),
(3, 'Resiliência', 'Você já recebeu um feedback muito negativo ou uma demissão inesperada? Como lidou com isso?'),
(3, 'Resiliência', 'Como você lida com a pressão por resultados em momentos de crise?');

-- Qualidade / Excelência
INSERT INTO public.values_questions_catalog (stage_number, value_label, question_text) VALUES
(3, 'Qualidade', 'Você prefere entregar rápido ou entregar bem? Justifique.'),
(3, 'Qualidade', 'O que significa excelência para você?'),
(3, 'Qualidade', 'Você já entregou algo que não estava 100% satisfeito? O que fez a respeito?'),
(3, 'Qualidade', 'Como você lida com retrabalho?');

-- Segurança
INSERT INTO public.values_questions_catalog (stage_number, value_label, question_text) VALUES
(3, 'Segurança', 'Você já esteve em uma situação de risco no ambiente de trabalho? O que fez?'),
(3, 'Segurança', 'Como você equilibra produtividade e segurança?'),
(3, 'Segurança', 'Você já deixou de fazer algo por considerar inseguro, mesmo sob pressão?'),
(3, 'Segurança', 'O que você faz quando vê um colega ignorando normas de segurança?'),
(3, 'Segurança', 'Segurança é responsabilidade de quem, na sua opinião?');

-- Servir
INSERT INTO public.values_questions_catalog (stage_number, value_label, question_text) VALUES
(3, 'Servir', 'Para você, qual é o significado de servir no contexto profissional?'),
(3, 'Servir', 'Conte uma vez em que você colocou o outro antes de si mesmo no trabalho.'),
(3, 'Servir', 'Você já fez algo sem esperar reconhecimento? Descreva.'),
(3, 'Servir', 'Qual foi o momento em que você mais se sentiu útil no trabalho?');

-- Iniciativa
INSERT INTO public.values_questions_catalog (stage_number, value_label, question_text) VALUES
(3, 'Iniciativa', 'Você já iniciou um projeto ou melhoria sem que ninguém pedisse? Conte.'),
(3, 'Iniciativa', 'Como você reage diante de um problema que não é tecnicamente sua responsabilidade?'),
(3, 'Iniciativa', 'O que te faz agir antes de ser solicitado?'),
(3, 'Iniciativa', 'Você se considera mais reativo ou proativo? Dê um exemplo.'),
(3, 'Iniciativa', 'Você já apresentou uma sugestão de mudança para a liderança? Como foi?'),
(3, 'Iniciativa', 'O que você faz quando percebe uma oportunidade que outros não viram?');

-- Honestidade
INSERT INTO public.values_questions_catalog (stage_number, value_label, question_text) VALUES
(3, 'Honestidade', 'Você já teve que ser honesto mesmo sabendo que poderia se prejudicar? Como foi?');

-- Comprometimento / Responsabilidade
INSERT INTO public.values_questions_catalog (stage_number, value_label, question_text) VALUES
(3, 'Comprometimento', 'Quando você assume um compromisso, como garante que ele será cumprido?');