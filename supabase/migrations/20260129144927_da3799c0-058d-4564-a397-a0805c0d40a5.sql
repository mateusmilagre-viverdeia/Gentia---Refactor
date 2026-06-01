-- Fase 3: Campos de organização do cargo
ALTER TABLE org_chart_nodes ADD COLUMN IF NOT EXISTS node_type TEXT DEFAULT 'cargo';
ALTER TABLE org_chart_nodes ADD COLUMN IF NOT EXISTS maturity_level INTEGER;
ALTER TABLE org_chart_nodes ADD COLUMN IF NOT EXISTS capacity_score INTEGER;
ALTER TABLE org_chart_nodes ADD COLUMN IF NOT EXISTS key_competencies TEXT[];
ALTER TABLE org_chart_nodes ADD COLUMN IF NOT EXISTS competency_gaps TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN org_chart_nodes.node_type IS 'Type: cargo, diretoria, gerencia, coordenacao, time, squad';
COMMENT ON COLUMN org_chart_nodes.maturity_level IS 'Maturity level 1-5';
COMMENT ON COLUMN org_chart_nodes.capacity_score IS 'Capacity score 1-100';
COMMENT ON COLUMN org_chart_nodes.key_competencies IS 'Array of key competencies';
COMMENT ON COLUMN org_chart_nodes.competency_gaps IS 'Array of competency gaps';