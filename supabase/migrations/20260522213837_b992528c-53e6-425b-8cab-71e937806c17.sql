-- 1. Add state column (UF) to candidate_profiles
ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS state text;

-- 2. Soft-disable factual/biographical questions in the question banks.
-- Pattern matches normalized (lowercase, unaccented) substrings.
-- We only flip is_active=false when that column exists, so this is safe across tables.

DO $$
DECLARE
  factual_regex text := '(\mnome\M|\msobrenome\M|nome completo|\mtelefone\M|\mcelular\M|\mwhatsapp\M|\mcontato\M|\memail\M|\me-mail\M|\midade\M|quantos anos|data de nascimento|\mnascimento\M|aniversario|\mcidade\M|onde (voce )?mora|de onde (voce )?(e|eh|vem)|\mestado\M|\muf\M|\mregiao\M)';
BEGIN
  -- values_questions_items (cultural)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='values_questions_items' AND column_name='is_active'
  ) THEN
    UPDATE public.values_questions_items
       SET is_active = false
     WHERE is_active = true
       AND public.unaccent(lower(coalesce(question_text,''))) ~ factual_regex;
  END IF;

  -- technical_question_bank
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='technical_question_bank' AND column_name='is_active'
  ) THEN
    UPDATE public.technical_question_bank
       SET is_active = false
     WHERE is_active = true
       AND public.unaccent(lower(coalesce(question_text,''))) ~ factual_regex;
  END IF;
END $$;