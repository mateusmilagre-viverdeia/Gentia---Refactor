-- Primeiro, desativar todas as perguntas existentes
UPDATE public.qa_questions SET is_active = false;

-- Agora, inserir as 20 perguntas corretas do modelo CORE oficial
-- Cada situação tem apenas 1 pergunta

-- Evento 1 - Dimensão C (Controle)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (1, 'Você sofre um revés financeiro.', 'C', 'Até que ponto você pode influenciar esta situação?', 'Não muito', 'Completamente', true);

-- Evento 2 - Dimensão R (Responsabilidade)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (2, 'Você foi preterido para uma promoção ou por um cliente.', 'R', 'Até que ponto você se sente responsável por melhorar a situação?', 'Não muito responsável', 'Completamente responsável', true);

-- Evento 3 - Dimensão A (Alcance)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (3, 'Você é criticado por um grande projeto que você acabou de finalizar.', 'A', 'A consequência dessa situação irá:', 'Afetar todos os aspectos da sua vida', 'Limitar-se a esta situação', true);

-- Evento 4 - Dimensão D (Duração)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (4, 'Você acidentalmente deletou um arquivo importante.', 'D', 'A consequência dessa situação irá:', 'Durar para sempre', 'Passar rápido', true);

-- Evento 5 - Dimensão A (Alcance)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (5, 'O projeto de alta prioridade que você está trabalhando foi cancelado.', 'A', 'A consequência dessa situação irá:', 'Afetar todos os aspectos da sua vida', 'Limitar-se a esta situação', true);

-- Evento 6 - Dimensão R (Responsabilidade)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (6, 'Alguém que você respeita ignora sua tentativa de discutir uma questão importante.', 'R', 'Até que ponto você se sente responsável por melhorar a situação?', 'Não muito responsável', 'Completamente responsável', true);

-- Evento 7 - Dimensão C (Controle)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (7, 'Pessoas são desfavoráveis em relação às suas ideias.', 'C', 'Até que ponto você pode influenciar esta situação?', 'Não muito', 'Completamente', true);

-- Evento 8 - Dimensão D (Duração)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (8, 'Você é incapaz de tirar longas férias.', 'D', 'A consequência dessa situação irá:', 'Durar para sempre', 'Passar rápido', true);

-- Evento 9 - Dimensão A (Alcance)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (9, 'Você violou seus valores para conseguir algo que você considera importante.', 'A', 'A consequência dessa situação irá:', 'Afetar todos os aspectos da sua vida', 'Limitar-se a esta situação', true);

-- Evento 10 - Dimensão D (Duração)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (10, 'Depois de muito esforço, você não conseguiu encontrar um documento importante.', 'D', 'A consequência dessa situação irá:', 'Durar para sempre', 'Passar rápido', true);

-- Evento 11 - Dimensão R (Responsabilidade)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (11, 'Seu local de trabalho é insatisfatório.', 'R', 'Até que ponto você se sente responsável por melhorar a situação?', 'Não muito responsável', 'Completamente responsável', true);

-- Evento 12 - Dimensão A (Alcance)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (12, 'Você perdeu aquele compromisso que você estava aguardando por tantos anos.', 'A', 'A consequência dessa situação irá:', 'Afetar todos os aspectos da sua vida', 'Limitar-se a esta situação', true);

-- Evento 13 - Dimensão C (Controle)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (13, 'Suas obrigações pessoais e profissionais não estão em equilíbrio.', 'C', 'Até que ponto você pode influenciar esta situação?', 'Não muito', 'Completamente', true);

-- Evento 14 - Dimensão D (Duração)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (14, 'Você nunca acha que tem dinheiro suficiente.', 'D', 'A consequência dessa situação irá:', 'Durar para sempre', 'Passar rápido', true);

-- Evento 15 - Dimensão C (Controle)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (15, 'Você não acha que está se exercitando regularmente como deveria.', 'C', 'Até que ponto você pode influenciar esta situação?', 'Não muito', 'Completamente', true);

-- Evento 16 - Dimensão R (Responsabilidade)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (16, 'Sua Organização não está atingindo resultados.', 'R', 'Até que ponto você se sente responsável por melhorar a situação?', 'Não muito responsável', 'Completamente responsável', true);

-- Evento 17 - Dimensão C (Controle)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (17, 'Seu computador quebrou pela terceira vez essa semana.', 'C', 'Até que ponto você pode influenciar esta situação?', 'Não muito', 'Completamente', true);

-- Evento 18 - Dimensão R (Responsabilidade)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (18, 'A reunião que você está é completamente uma perda de tempo.', 'R', 'Até que ponto você se sente responsável por melhorar a situação?', 'Não muito responsável', 'Completamente responsável', true);

-- Evento 19 - Dimensão D (Duração)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (19, 'Você perdeu algo de muita importância para você.', 'D', 'A consequência dessa situação irá:', 'Durar para sempre', 'Passar rápido', true);

-- Evento 20 - Dimensão A (Alcance)
INSERT INTO public.qa_questions (event_number, event_description, dimension, question_text, scale_low_label, scale_high_label, is_active)
VALUES (20, 'Seu chefe é inflexível com suas decisões.', 'A', 'A consequência dessa situação irá:', 'Afetar todos os aspectos da sua vida', 'Limitar-se a esta situação', true);