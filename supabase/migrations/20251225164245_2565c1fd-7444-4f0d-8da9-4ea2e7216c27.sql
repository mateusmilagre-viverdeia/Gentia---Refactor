-- Inserir 6 novos badges para o Assessment ROIP
INSERT INTO badges (name, description, icon, tier, category, points, requirement) VALUES
-- Badge de início
('Diagnóstico Iniciado', 'Iniciou o Assessment ROIP', '📋', 'bronze', 'phase', 25, 
 '{"type": "step_started", "step": "assessment_roip"}'::jsonb),

-- Badge de conclusão
('ROIP Concluído', 'Completou o Assessment ROIP', '🎯', 'gold', 'phase', 200, 
 '{"type": "step_complete", "step": "assessment_roip"}'::jsonb),

-- Badge de score alto
('Alto Investidor em Pessoas', 'Obteve score acima de 80% no Assessment ROIP', '⭐', 'platinum', 'performance', 300, 
 '{"type": "roip_score", "min": 80}'::jsonb),

-- Badge de score médio
('Investidor em Pessoas', 'Obteve score entre 60-80% no Assessment ROIP', '🌟', 'silver', 'performance', 150, 
 '{"type": "roip_score", "min": 60, "max": 80}'::jsonb),

-- Badge de análise IA
('Insights Avançados', 'Gerou análise de IA para o Assessment ROIP', '🤖', 'gold', 'special', 100, 
 '{"type": "roip_ai_analysis"}'::jsonb),

-- Badge de diagnóstico completo
('Diagnóstico Completo', 'Completou toda a jornada de Diagnóstico', '🏆', 'platinum', 'unlock', 250, 
 '{"type": "journey_complete", "journey": "diagnostico"}'::jsonb)
ON CONFLICT DO NOTHING;