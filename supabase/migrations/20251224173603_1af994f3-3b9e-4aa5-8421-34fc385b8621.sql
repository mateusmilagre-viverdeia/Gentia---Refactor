-- =============================================
-- TEMPLATE PADRÃO EP+ DE ONBOARDING
-- =============================================

-- 1. Criar o template principal
INSERT INTO public.onboarding_templates (id, name, description, default_duration_days, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Método EP+ de Onboarding',
  'Template padrão do Método EP+ com 6 etapas: Pré-onboarding, Boas-vindas & Cultura, Clareza de Papel, Execução Assistida, Autonomia & Performance e Fechamento. Inclui checkpoints nos dias 7, 30, 60 e 90.',
  90,
  true
);

-- 2. Criar as 6 fases do template

-- Fase 1: Pré-onboarding (antes do Dia 1)
INSERT INTO public.onboarding_template_phases (id, template_id, name, description, order_index, duration_days)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Pré-onboarding',
  'Preparação antes do Dia 1 do colaborador. Foco em garantir que tudo esteja pronto para recebê-lo.',
  0,
  7
);

-- Fase 2: Boas-vindas & Cultura
INSERT INTO public.onboarding_template_phases (id, template_id, name, description, order_index, duration_days)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Boas-vindas & Cultura',
  'Primeiro dia e primeira semana. Foco em cultura, história e integração inicial.',
  1,
  7
);

-- Fase 3: Clareza de Papel & Expectativas
INSERT INTO public.onboarding_template_phases (id, template_id, name, description, order_index, duration_days)
VALUES (
  'b0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'Clareza de Papel & Expectativas',
  'Definição clara de responsabilidades, metas e indicadores de sucesso.',
  2,
  14
);

-- Fase 4: Execução Assistida
INSERT INTO public.onboarding_template_phases (id, template_id, name, description, order_index, duration_days)
VALUES (
  'b0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'Execução Assistida',
  'Primeiras entregas com acompanhamento próximo. Shadowing e feedback contínuo.',
  3,
  21
);

-- Fase 5: Autonomia & Performance
INSERT INTO public.onboarding_template_phases (id, template_id, name, description, order_index, duration_days)
VALUES (
  'b0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'Autonomia & Performance',
  'Desenvolvimento da independência e foco em resultados. Metas 60-90 dias.',
  4,
  30
);

-- Fase 6: Fechamento & Avaliação Final
INSERT INTO public.onboarding_template_phases (id, template_id, name, description, order_index, duration_days)
VALUES (
  'b0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  'Fechamento & Avaliação Final',
  'Conclusão do onboarding com avaliações formais e registro para auditoria.',
  5,
  11
);

-- 3. Criar as tarefas para cada fase

-- ========== FASE 1: PRÉ-ONBOARDING ==========
INSERT INTO public.onboarding_template_tasks (phase_id, title, description, responsible_type, is_required, order_index)
VALUES 
  ('b0000000-0000-0000-0000-000000000001', 'Enviar e-mail de boas-vindas', 'Enviar mensagem de boas-vindas com informações iniciais sobre o primeiro dia', 'rh', true, 0),
  ('b0000000-0000-0000-0000-000000000001', 'Criar acessos e credenciais', 'Configurar e-mail corporativo, sistemas e ferramentas necessárias', 'ti', true, 1),
  ('b0000000-0000-0000-0000-000000000001', 'Preparar estação de trabalho', 'Garantir que equipamentos e espaço físico estejam prontos', 'ti', true, 2),
  ('b0000000-0000-0000-0000-000000000001', 'Enviar agenda da primeira semana', 'Compartilhar cronograma detalhado dos primeiros dias', 'leader', true, 3),
  ('b0000000-0000-0000-0000-000000000001', 'Designar e apresentar buddy', 'Escolher e comunicar quem será o buddy/mentor do novo colaborador', 'leader', true, 4),
  ('b0000000-0000-0000-0000-000000000001', 'Enviar kit cultura EP+', 'Compartilhar materiais sobre missão, visão, valores e cultura da empresa', 'rh', true, 5),
  ('b0000000-0000-0000-0000-000000000001', 'Confirmar data e horário do Dia 1', 'Validar logística do primeiro dia com o colaborador', 'rh', true, 6);

-- ========== FASE 2: BOAS-VINDAS & CULTURA ==========
INSERT INTO public.onboarding_template_tasks (phase_id, title, description, responsible_type, is_required, order_index)
VALUES 
  ('b0000000-0000-0000-0000-000000000002', 'Realizar apresentação institucional', 'Apresentar visão geral da empresa, estrutura e principais áreas', 'rh', true, 0),
  ('b0000000-0000-0000-0000-000000000002', 'Contar história da empresa', 'Compartilhar origem, evolução e marcos importantes da organização', 'leader', true, 1),
  ('b0000000-0000-0000-0000-000000000002', 'Apresentar código de cultura', 'Explicar comportamentos esperados e valores praticados', 'rh', true, 2),
  ('b0000000-0000-0000-0000-000000000002', 'Apresentar missão, visão e valores', 'Garantir entendimento do propósito e direção estratégica', 'rh', true, 3),
  ('b0000000-0000-0000-0000-000000000002', 'Realizar tour e apresentação ao time', 'Apresentar colegas, áreas físicas e dinâmica do escritório', 'leader', true, 4),
  ('b0000000-0000-0000-0000-000000000002', 'Apresentar estratégia e direção', 'Compartilhar objetivos estratégicos e projetos prioritários', 'leader', false, 5),
  ('b0000000-0000-0000-0000-000000000002', 'Explicar compliance e políticas', 'Apresentar regras, políticas internas e procedimentos obrigatórios', 'rh', true, 6);

-- ========== FASE 3: CLAREZA DE PAPEL & EXPECTATIVAS ==========
INSERT INTO public.onboarding_template_tasks (phase_id, title, description, responsible_type, is_required, order_index)
VALUES 
  ('b0000000-0000-0000-0000-000000000003', 'Definir responsabilidades do cargo', 'Detalhar atividades, entregas e escopo de atuação', 'leader', true, 0),
  ('b0000000-0000-0000-0000-000000000003', 'Explicar o que é sucesso no papel', 'Definir critérios claros de performance e excelência', 'leader', true, 1),
  ('b0000000-0000-0000-0000-000000000003', 'Estabelecer metas dos primeiros 30 dias', 'Definir objetivos específicos e mensuráveis para o primeiro mês', 'leader', true, 2),
  ('b0000000-0000-0000-0000-000000000003', 'Apresentar indicadores-chave (KPIs)', 'Explicar métricas que serão acompanhadas', 'leader', true, 3),
  ('b0000000-0000-0000-0000-000000000003', 'Agendar reuniões 1:1 recorrentes', 'Definir frequência e formato dos encontros individuais', 'leader', true, 4);

-- ========== FASE 4: EXECUÇÃO ASSISTIDA ==========
INSERT INTO public.onboarding_template_tasks (phase_id, title, description, responsible_type, is_required, order_index)
VALUES 
  ('b0000000-0000-0000-0000-000000000004', 'Realizar primeiras entregas reais', 'Executar tarefas do cargo com supervisão e suporte', 'employee', true, 0),
  ('b0000000-0000-0000-0000-000000000004', 'Conduzir sessões de shadowing', 'Acompanhar colegas experientes em atividades-chave', 'buddy', true, 1),
  ('b0000000-0000-0000-0000-000000000004', 'Dar feedback semanal estruturado', 'Realizar conversas de feedback sobre progresso e ajustes', 'leader', true, 2),
  ('b0000000-0000-0000-0000-000000000004', 'Completar treinamentos técnicos', 'Realizar capacitações específicas da função', 'employee', true, 3),
  ('b0000000-0000-0000-0000-000000000004', 'Acompanhar adaptação do colaborador', 'Monitorar integração e identificar necessidades de suporte', 'buddy', false, 4);

-- ========== FASE 5: AUTONOMIA & PERFORMANCE ==========
INSERT INTO public.onboarding_template_tasks (phase_id, title, description, responsible_type, is_required, order_index)
VALUES 
  ('b0000000-0000-0000-0000-000000000005', 'Realizar entregas com autonomia', 'Executar atividades de forma independente', 'employee', true, 0),
  ('b0000000-0000-0000-0000-000000000005', 'Definir metas 60-90 dias', 'Estabelecer objetivos de médio prazo com maior complexidade', 'leader', true, 1),
  ('b0000000-0000-0000-0000-000000000005', 'Conduzir feedback estruturado mensal', 'Realizar avaliação formal do progresso', 'leader', true, 2),
  ('b0000000-0000-0000-0000-000000000005', 'Realizar avaliação parcial (60 dias)', 'Documentar evolução e áreas de desenvolvimento', 'leader', true, 3);

-- ========== FASE 6: FECHAMENTO & AVALIAÇÃO FINAL ==========
INSERT INTO public.onboarding_template_tasks (phase_id, title, description, responsible_type, is_required, order_index)
VALUES 
  ('b0000000-0000-0000-0000-000000000006', 'Realizar autoavaliação do colaborador', 'Colaborador avalia própria jornada de onboarding', 'employee', true, 0),
  ('b0000000-0000-0000-0000-000000000006', 'Conduzir avaliação final do líder', 'Líder avalia desempenho, cultura e prontidão', 'leader', true, 1),
  ('b0000000-0000-0000-0000-000000000006', 'Realizar revisão do RH', 'RH valida processo e registra conclusões', 'rh', true, 2),
  ('b0000000-0000-0000-0000-000000000006', 'Registrar decisão formal', 'Documentar recomendação: aprovado, ressalvas ou replanejar', 'rh', true, 3),
  ('b0000000-0000-0000-0000-000000000006', 'Encerrar onboarding oficialmente', 'Comunicar conclusão e próximos passos ao colaborador', 'leader', true, 4);