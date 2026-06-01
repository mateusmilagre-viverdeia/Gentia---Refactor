-- 1) feature_llm_mapping: mapeamento editável de qual modelo LLM cada feature usa.
CREATE TABLE public.feature_llm_mapping (
  feature_key text PRIMARY KEY,
  model_id text NOT NULL,
  avg_tokens_input integer,
  avg_tokens_output integer,
  notes text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_llm_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read llm mapping"
  ON public.feature_llm_mapping FOR SELECT TO authenticated USING (true);

CREATE POLICY "super admin write llm mapping"
  ON public.feature_llm_mapping FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_feature_llm_mapping_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_feature_llm_mapping_updated_at
  BEFORE UPDATE ON public.feature_llm_mapping
  FOR EACH ROW EXECUTE FUNCTION public.touch_feature_llm_mapping_updated_at();

-- Seed inicial com mapeamento atual hardcoded
INSERT INTO public.feature_llm_mapping (feature_key, model_id, avg_tokens_input, avg_tokens_output, notes) VALUES
  ('culture_interview_realtime',     'openai/gpt-realtime-mini',  NULL, NULL, 'Entrevista cultural por voz — cobrada por minuto.'),
  ('technical_interview_realtime',   'openai/gpt-realtime-mini',  NULL, NULL, 'Entrevista técnica por voz — cobrada por minuto.'),
  ('culture_interview_evaluation',   'google/gemini-2.5-flash',   3000, 1500, 'Avaliação LLM da entrevista cultural (embutida no preço de tabela).'),
  ('technical_interview_evaluation', 'google/gemini-2.5-flash',   3000, 1500, 'Avaliação LLM da entrevista técnica (embutida no preço de tabela).'),
  ('cultural_match_llm',             'google/gemini-2.5-flash',    800,  400, 'Match cultural candidato↔vaga.'),
  ('disc_evaluation',                'google/gemini-2.5-flash',   1500,  500, 'Avaliação DISC final.'),
  ('job_description_generation',     'google/gemini-2.5-pro',     1000, 2000, 'Geração de JD pela IA.'),
  ('candidate_ranking',              'google/gemini-2.5-flash',   2000,  800, 'Ranking inteligente de candidatos.'),
  ('screening_evaluation',           'google/gemini-2.5-flash-lite', 800, 200, 'Triagem YES/NO de respostas.'),
  ('market_research',                'perplexity/sonar-pro',      1500, 2000, 'Pesquisa de mercado com Perplexity.')
ON CONFLICT (feature_key) DO NOTHING;

-- 2) llm_pricing_alerts: divergências detectadas pelo cron entre código e provedor.
CREATE TABLE public.llm_pricing_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text NOT NULL,
  field text NOT NULL CHECK (field IN ('input','output','audio_input','audio_output','per_minute')),
  current_value_usd numeric(12,6) NOT NULL,
  detected_value_usd numeric(12,6) NOT NULL,
  delta_pct numeric(8,2) GENERATED ALWAYS AS (
    CASE WHEN current_value_usd > 0
      THEN ROUND(((detected_value_usd - current_value_usd) / current_value_usd * 100)::numeric, 2)
      ELSE NULL END
  ) STORED,
  source_url text NOT NULL,
  raw_excerpt text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_llm_pricing_alerts_unack ON public.llm_pricing_alerts (detected_at DESC) WHERE acknowledged_at IS NULL;
CREATE INDEX idx_llm_pricing_alerts_model ON public.llm_pricing_alerts (model, field, detected_at DESC);

ALTER TABLE public.llm_pricing_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin read alerts"  ON public.llm_pricing_alerts FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "super admin write alerts" ON public.llm_pricing_alerts FOR ALL    TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));