-- Remover badge de Diagnóstico Completo
DELETE FROM badges WHERE name = 'Diagnóstico Completo';

-- Adicionar novos badges para etapas funcionais

-- Fase: Evento de Cultura
INSERT INTO badges (name, description, icon, category, tier, points, requirement)
VALUES ('Celebrador', 'Planejou seu evento de cultura', 'PartyPopper', 'phase', 'silver', 100, '{"type": "step_complete", "step": "evento"}');

-- Fase: Rituais
INSERT INTO badges (name, description, icon, category, tier, points, requirement)
VALUES ('Ritualista', 'Definiu rituais de fortalecimento', 'Repeat', 'phase', 'silver', 100, '{"type": "step_complete", "step": "rituais"}');

-- Fase: Culture Code
INSERT INTO badges (name, description, icon, category, tier, points, requirement)
VALUES ('Narrador', 'Criou o Culture Code da empresa', 'BookOpen', 'phase', 'gold', 150, '{"type": "step_complete", "step": "culture_code"}');

-- Fase: Vendendo a Empresa
INSERT INTO badges (name, description, icon, category, tier, points, requirement)
VALUES ('Vendedor', 'Criou conteúdo para atrair talentos', 'Megaphone', 'phase', 'silver', 100, '{"type": "step_complete", "step": "vendendo"}');

-- Fase: Funil de Contratação
INSERT INTO badges (name, description, icon, category, tier, points, requirement)
VALUES ('Recrutador', 'Configurou funil de contratação', 'Filter', 'phase', 'silver', 100, '{"type": "step_complete", "step": "funil"}');

-- Fase: Perguntas de Valores
INSERT INTO badges (name, description, icon, category, tier, points, requirement)
VALUES ('Entrevistador', 'Criou perguntas baseadas em valores', 'MessageCircleQuestion', 'phase', 'silver', 100, '{"type": "step_complete", "step": "perguntas"}');

-- Fase: Organograma
INSERT INTO badges (name, description, icon, category, tier, points, requirement)
VALUES ('Arquiteto', 'Montou o organograma da empresa', 'Network', 'phase', 'silver', 100, '{"type": "step_complete", "step": "organograma"}');

-- Fase: Analisador de Pessoas
INSERT INTO badges (name, description, icon, category, tier, points, requirement)
VALUES ('Analista', 'Analisou o time com base em valores', 'ScanSearch', 'phase', 'silver', 100, '{"type": "step_complete", "step": "analisador"}');

-- Fase: Avaliação de Desempenho
INSERT INTO badges (name, description, icon, category, tier, points, requirement)
VALUES ('Avaliador', 'Avaliou performance do time', 'ClipboardCheck', 'phase', 'silver', 100, '{"type": "step_complete", "step": "desempenho"}');

-- Fase: Habilidade Única
INSERT INTO badges (name, description, icon, category, tier, points, requirement)
VALUES ('Descobridor', 'Descobriu talentos únicos do time', 'Gem', 'phase', 'gold', 150, '{"type": "step_complete", "step": "habilidade"}');

-- Fase: Maturidade do Time
INSERT INTO badges (name, description, icon, category, tier, points, requirement)
VALUES ('Mestre do Time', 'Avaliou maturidade da equipe', 'GraduationCap', 'phase', 'gold', 150, '{"type": "step_complete", "step": "maturidade"}');

-- Marco: Retenção Completa
INSERT INTO badges (name, description, icon, category, tier, points, requirement)
VALUES ('Retenção Completa', 'Completou toda a jornada de retenção', 'Shield', 'milestone', 'gold', 400, '{"type": "journey_complete", "journey": "retencao"}');