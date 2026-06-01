
ALTER TABLE public.fees_historico
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.garantias_reposicao
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_fees_historico_is_demo
  ON public.fees_historico (account_id) WHERE is_demo = true;

CREATE INDEX IF NOT EXISTS idx_garantias_reposicao_is_demo
  ON public.garantias_reposicao (account_id) WHERE is_demo = true;
