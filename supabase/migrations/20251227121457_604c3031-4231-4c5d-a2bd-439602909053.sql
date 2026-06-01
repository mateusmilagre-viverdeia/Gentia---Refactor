-- Adicionar colunas de trial à org_billing
ALTER TABLE public.org_billing 
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;

-- Criar índice para consultas de trial
CREATE INDEX IF NOT EXISTS idx_org_billing_trial_end ON public.org_billing(trial_end) WHERE trial_end IS NOT NULL;