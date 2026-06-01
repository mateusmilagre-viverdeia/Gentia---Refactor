-- =============================================
-- Atualizar constraint de categorias para incluir novas
-- =============================================
ALTER TABLE public.badges DROP CONSTRAINT badges_category_check;

ALTER TABLE public.badges ADD CONSTRAINT badges_category_check 
  CHECK (category = ANY (ARRAY['phase', 'milestone', 'performance', 'special', 'progress', 'action_plan', 'iteration', 'speed', 'unlock', 'quality']::text[]));

-- =============================================
-- Novas badges de progresso parcial (25%, 50%, 75% por etapa)
-- =============================================
INSERT INTO public.badges (name, description, icon, category, tier, points, requirement) VALUES
-- Valores
('Valores 25%', 'Atingiu 25% da etapa de Valores', '🎯', 'progress', 'bronze', 25, '{"type": "step_progress", "step": "valores", "min": 25}'),
('Valores 50%', 'Atingiu 50% da etapa de Valores', '🎯', 'progress', 'bronze', 50, '{"type": "step_progress", "step": "valores", "min": 50}'),
('Valores 75%', 'Atingiu 75% da etapa de Valores', '🎯', 'progress', 'silver', 75, '{"type": "step_progress", "step": "valores", "min": 75}'),

-- Missão
('Missão 25%', 'Atingiu 25% da etapa de Missão', '🚀', 'progress', 'bronze', 25, '{"type": "step_progress", "step": "missao", "min": 25}'),
('Missão 50%', 'Atingiu 50% da etapa de Missão', '🚀', 'progress', 'bronze', 50, '{"type": "step_progress", "step": "missao", "min": 50}'),
('Missão 75%', 'Atingiu 75% da etapa de Missão', '🚀', 'progress', 'silver', 75, '{"type": "step_progress", "step": "missao", "min": 75}'),

-- Visão
('Visão 25%', 'Atingiu 25% da etapa de Visão', '👁️', 'progress', 'bronze', 25, '{"type": "step_progress", "step": "visao", "min": 25}'),
('Visão 50%', 'Atingiu 50% da etapa de Visão', '👁️', 'progress', 'bronze', 50, '{"type": "step_progress", "step": "visao", "min": 50}'),
('Visão 75%', 'Atingiu 75% da etapa de Visão', '👁️', 'progress', 'silver', 75, '{"type": "step_progress", "step": "visao", "min": 75}'),

-- Decisão
('Decisão 25%', 'Atingiu 25% da etapa de Decisão', '⚖️', 'progress', 'bronze', 25, '{"type": "step_progress", "step": "decisao", "min": 25}'),
('Decisão 50%', 'Atingiu 50% da etapa de Decisão', '⚖️', 'progress', 'bronze', 50, '{"type": "step_progress", "step": "decisao", "min": 50}'),
('Decisão 75%', 'Atingiu 75% da etapa de Decisão', '⚖️', 'progress', 'silver', 75, '{"type": "step_progress", "step": "decisao", "min": 75}'),

-- Energia
('Energia 25%', 'Atingiu 25% da etapa de Energia', '⚡', 'progress', 'bronze', 25, '{"type": "step_progress", "step": "energia", "min": 25}'),
('Energia 50%', 'Atingiu 50% da etapa de Energia', '⚡', 'progress', 'bronze', 50, '{"type": "step_progress", "step": "energia", "min": 50}'),
('Energia 75%', 'Atingiu 75% da etapa de Energia', '⚡', 'progress', 'silver', 75, '{"type": "step_progress", "step": "energia", "min": 75}'),

-- Desenvolvimento
('Desenvolvimento 25%', 'Atingiu 25% da etapa de Desenvolvimento', '📈', 'progress', 'bronze', 25, '{"type": "step_progress", "step": "desenvolvimento", "min": 25}'),
('Desenvolvimento 50%', 'Atingiu 50% da etapa de Desenvolvimento', '📈', 'progress', 'bronze', 50, '{"type": "step_progress", "step": "desenvolvimento", "min": 50}'),
('Desenvolvimento 75%', 'Atingiu 75% da etapa de Desenvolvimento', '📈', 'progress', 'silver', 75, '{"type": "step_progress", "step": "desenvolvimento", "min": 75}');

-- =============================================
-- Badges de Plano de Ação
-- =============================================
INSERT INTO public.badges (name, description, icon, category, tier, points, requirement) VALUES
('Plano Criado', 'Criou seu primeiro plano de ação', '📋', 'action_plan', 'bronze', 50, '{"type": "action_plan_created"}'),
('Executor 25%', 'Completou 25% das ações do plano', '✅', 'action_plan', 'bronze', 75, '{"type": "action_plan_progress", "min": 25}'),
('Executor 50%', 'Completou 50% das ações do plano', '✅', 'action_plan', 'silver', 100, '{"type": "action_plan_progress", "min": 50}'),
('Executor 75%', 'Completou 75% das ações do plano', '✅', 'action_plan', 'gold', 150, '{"type": "action_plan_progress", "min": 75}'),
('Plano Completo', 'Completou todas as ações do plano', '🏆', 'action_plan', 'platinum', 300, '{"type": "action_plan_progress", "min": 100}');

-- =============================================
-- Badges de Atualização/Iteração
-- =============================================
INSERT INTO public.badges (name, description, icon, category, tier, points, requirement) VALUES
('Iterador', 'Atualizou um plano pela segunda vez', '🔄', 'iteration', 'bronze', 50, '{"type": "plan_updated", "min": 2}'),
('Melhorista', 'Atualizou planos 5+ vezes', '🔧', 'iteration', 'silver', 100, '{"type": "plan_updated", "min": 5}'),
('Perfeccionista Iterativo', 'Atualizou planos 10+ vezes', '💪', 'iteration', 'gold', 200, '{"type": "plan_updated", "min": 10}');

-- =============================================
-- Badges de Velocidade
-- =============================================
INSERT INTO public.badges (name, description, icon, category, tier, points, requirement) VALUES
('Velocista', 'Completou uma etapa em menos de 3 dias', '⚡', 'speed', 'gold', 150, '{"type": "speed_complete", "max_days": 3}'),
('Focado', 'Completou uma etapa em menos de 7 dias', '🎯', 'speed', 'silver', 100, '{"type": "speed_complete", "max_days": 7}'),
('Maratonista', 'Completou 3+ etapas rapidamente', '🏃', 'speed', 'platinum', 300, '{"type": "speed_count", "min": 3, "max_days": 7}');

-- =============================================
-- Badges de Desbloqueio de Jornada
-- =============================================
INSERT INTO public.badges (name, description, icon, category, tier, points, requirement) VALUES
('Atração Desbloqueada', 'Desbloqueou a jornada de Atração', '🔓', 'unlock', 'silver', 100, '{"type": "journey_unlocked", "journey": "atracao"}'),
('Retenção Desbloqueada', 'Desbloqueou a jornada de Retenção', '🔓', 'unlock', 'silver', 100, '{"type": "journey_unlocked", "journey": "retencao"}');

-- =============================================
-- Badges de Qualidade
-- =============================================
INSERT INTO public.badges (name, description, icon, category, tier, points, requirement) VALUES
('Detalhista', 'Preencheu 80%+ dos campos opcionais', '📝', 'quality', 'silver', 100, '{"type": "quality_fields", "min": 80}'),
('Meticuloso', 'Preencheu todos os campos com qualidade', '✨', 'quality', 'gold', 200, '{"type": "quality_complete"}');