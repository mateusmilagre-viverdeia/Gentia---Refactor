-- 1. Permitir decimais no preço de tabela das features.
ALTER TABLE public.recruitment_credit_costs
  ALTER COLUMN credits_per_use TYPE numeric(10,4) USING credits_per_use::numeric(10,4);

-- 2. Atualizar features de entrevista de voz para preço justo de tabela (0,35 cr/min).
--    Custo real LLM ~R$0,15/min; com margem ~220% = R$0,49/min ≈ 0,32 cr (Pro 1).
--    Arredondado para 0,35 para cobrir variações e embutir a avaliação LLM final.
UPDATE public.recruitment_credit_costs
SET
  credits_per_use = 0.35,
  description = 'Entrevista cultural por voz (IA Realtime) — preço de tabela: 0,35 crédito por minuto (inclui avaliação LLM final)'
WHERE feature_key = 'culture_interview_realtime';

UPDATE public.recruitment_credit_costs
SET
  credits_per_use = 0.35,
  description = 'Entrevista técnica por voz (IA Realtime) — preço de tabela: 0,35 crédito por minuto (inclui avaliação LLM final)'
WHERE feature_key = 'technical_interview_realtime';

-- 3. Desativar as features de avaliação separada (agora embutidas no preço/min).
UPDATE public.recruitment_credit_costs
SET is_active = false,
    description = description || ' [DEPRECATED: embutida em *_realtime]'
WHERE feature_key IN ('culture_interview_evaluation', 'technical_interview_evaluation');