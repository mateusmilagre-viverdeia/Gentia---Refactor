-- 1) Complementar fees_historico
ALTER TABLE public.fees_historico
  ADD COLUMN IF NOT EXISTS forma_recebimento text,
  ADD COLUMN IF NOT EXISTS numero_nota_fiscal text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS update_fees_historico_updated_at ON public.fees_historico;
CREATE TRIGGER update_fees_historico_updated_at
  BEFORE UPDATE ON public.fees_historico
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2) sla_status em recruitment_jobs
ALTER TABLE public.recruitment_jobs
  ADD COLUMN IF NOT EXISTS sla_status text DEFAULT 'no_prazo';

-- 3) Tabela sla_alertas
CREATE TABLE IF NOT EXISTS public.sla_alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vaga_id uuid REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  tipo_alerta text NOT NULL,
  dias_restantes integer,
  status text DEFAULT 'ativo',
  resolucao_nota text,
  responsavel_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_alertas_account ON public.sla_alertas(account_id, status);
CREATE INDEX IF NOT EXISTS idx_sla_alertas_vaga ON public.sla_alertas(vaga_id);

ALTER TABLE public.sla_alertas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view org sla alerts" ON public.sla_alertas;
CREATE POLICY "Members view org sla alerts"
  ON public.sla_alertas FOR SELECT
  USING (account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true));

DROP POLICY IF EXISTS "Members manage org sla alerts" ON public.sla_alertas;
CREATE POLICY "Members manage org sla alerts"
  ON public.sla_alertas FOR ALL
  USING (account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true));

DROP TRIGGER IF EXISTS update_sla_alertas_updated_at ON public.sla_alertas;
CREATE TRIGGER update_sla_alertas_updated_at
  BEFORE UPDATE ON public.sla_alertas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Tabela garantias_reposicao
CREATE TABLE IF NOT EXISTS public.garantias_reposicao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vaga_original_id uuid REFERENCES public.recruitment_jobs(id) ON DELETE SET NULL,
  vaga_reposicao_id uuid REFERENCES public.recruitment_jobs(id) ON DELETE SET NULL,
  candidato_id uuid NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes_consultoria(id) ON DELETE SET NULL,
  data_contratacao timestamptz NOT NULL,
  data_desligamento timestamptz,
  prazo_garantia_dias integer NOT NULL,
  garantia_expira_em timestamptz NOT NULL,
  status text DEFAULT 'ativa',
  motivo_desligamento text,
  observacoes text,
  acionada_em timestamptz,
  concluida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_garantias_account ON public.garantias_reposicao(account_id, status);
CREATE INDEX IF NOT EXISTS idx_garantias_cliente ON public.garantias_reposicao(cliente_id);
CREATE INDEX IF NOT EXISTS idx_garantias_vaga ON public.garantias_reposicao(vaga_original_id);

ALTER TABLE public.garantias_reposicao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view org garantias" ON public.garantias_reposicao;
CREATE POLICY "Members view org garantias"
  ON public.garantias_reposicao FOR SELECT
  USING (account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true));

DROP POLICY IF EXISTS "Members manage org garantias" ON public.garantias_reposicao;
CREATE POLICY "Members manage org garantias"
  ON public.garantias_reposicao FOR ALL
  USING (account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND is_active = true));

DROP TRIGGER IF EXISTS update_garantias_updated_at ON public.garantias_reposicao;
CREATE TRIGGER update_garantias_updated_at
  BEFORE UPDATE ON public.garantias_reposicao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Adicionar campos em recruitment_cross_match_suggestions
ALTER TABLE public.recruitment_cross_match_suggestions
  ADD COLUMN IF NOT EXISTS nota_recrutador text,
  ADD COLUMN IF NOT EXISTS rejeitado_motivo text;

-- 6) Cron sla-monitor diário 08h BRT (pg_cron já habilitado)
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sla-monitor-daily') THEN
    PERFORM cron.unschedule('sla-monitor-daily');
  END IF;
END $do$;

SELECT cron.schedule(
  'sla-monitor-daily',
  '0 11 * * *',
  'SELECT net.http_post(url := ''https://axumduklmiiptumdsgtu.supabase.co/functions/v1/sla-monitor'', headers := ''{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4dW1kdWtsbWlpcHR1bWRzZ3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MDgyNzIsImV4cCI6MjA3ODQ4NDI3Mn0.o1xpZtdm8X-HfI3N-4CdpltIgZPyqerYtfGeTpytxSg"}''::jsonb, body := ''{}''::jsonb);'
);