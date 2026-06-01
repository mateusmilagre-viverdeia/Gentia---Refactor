-- Adicionar campos de score de atratividade na tabela recruitment_jobs
-- Score calculado automaticamente baseado em completude e qualidade da vaga

ALTER TABLE public.recruitment_jobs
ADD COLUMN IF NOT EXISTS attractiveness_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS attractiveness_breakdown JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS attractiveness_suggestions TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS attractiveness_calculated_at TIMESTAMPTZ;

-- Índice para filtrar por score
CREATE INDEX IF NOT EXISTS idx_recruitment_jobs_attractiveness 
ON public.recruitment_jobs(attractiveness_score DESC);

-- Comentários
COMMENT ON COLUMN public.recruitment_jobs.attractiveness_score IS 'Score 0-100 indicando atratividade da vaga para candidatos';
COMMENT ON COLUMN public.recruitment_jobs.attractiveness_breakdown IS 'Breakdown do score por categoria';
COMMENT ON COLUMN public.recruitment_jobs.attractiveness_suggestions IS 'Sugestões para melhorar o score';