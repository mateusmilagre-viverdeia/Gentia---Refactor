-- Adicionar colunas para armazenar comportamentos (DOs e DON'Ts)
ALTER TABLE pulse_company_values 
ADD COLUMN IF NOT EXISTS dos text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS donts text[] DEFAULT '{}';

-- Comentários explicativos
COMMENT ON COLUMN pulse_company_values.dos IS 'Comportamentos esperados (Como vivemos este valor)';
COMMENT ON COLUMN pulse_company_values.donts IS 'Comportamentos não tolerados (Como não vivemos este valor)';