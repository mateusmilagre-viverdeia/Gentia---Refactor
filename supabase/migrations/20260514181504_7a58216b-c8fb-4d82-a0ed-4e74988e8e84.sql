
-- =====================================================
-- Camada F (Modo Sombra) + Camadas A/B/C/D — Schema
-- =====================================================

-- 1) culture_interview_sessions: colunas para nova régua + modo sombra
ALTER TABLE public.culture_interview_sessions
  ADD COLUMN IF NOT EXISTS legacy_score numeric(5,1),
  ADD COLUMN IF NOT EXISTS legacy_recommendation text,
  ADD COLUMN IF NOT EXISTS shadow_evaluation_diff jsonb,
  ADD COLUMN IF NOT EXISTS evidence_floor_passed boolean,
  ADD COLUMN IF NOT EXISTS red_flags_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_confidence_level text,
  ADD COLUMN IF NOT EXISTS recommendation text,
  ADD COLUMN IF NOT EXISTS evaluation_audit_trail jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS strictness_profile_used text;

-- Default global de modo sombra é controlado por flag (ver settings da conta abaixo);
-- por sessão, podemos marcar individualmente.
ALTER TABLE public.culture_interview_sessions
  ADD COLUMN IF NOT EXISTS evaluated_in_shadow_mode boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_culture_sessions_shadow
  ON public.culture_interview_sessions (evaluated_in_shadow_mode, completed_at DESC)
  WHERE evaluated_in_shadow_mode = true;

CREATE INDEX IF NOT EXISTS idx_culture_sessions_recommendation
  ON public.culture_interview_sessions (recommendation, completed_at DESC);

-- 2) recruitment_agents: perfil de rigor por agente
ALTER TABLE public.recruitment_agents
  ADD COLUMN IF NOT EXISTS strictness_profile text NOT NULL DEFAULT 'standard';

ALTER TABLE public.recruitment_agents
  DROP CONSTRAINT IF EXISTS recruitment_agents_strictness_profile_check;
ALTER TABLE public.recruitment_agents
  ADD CONSTRAINT recruitment_agents_strictness_profile_check
  CHECK (strictness_profile IN ('lenient', 'standard', 'strict'));

-- 3) culture_interview_criteria_evaluations: novos campos da nova rubrica
ALTER TABLE public.culture_interview_criteria_evaluations
  ADD COLUMN IF NOT EXISTS evidence_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS red_flags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS confidence_level text,
  ADD COLUMN IF NOT EXISTS generic_response_detected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS base_score numeric(5,1),
  ADD COLUMN IF NOT EXISTS penalty_applied numeric(5,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS legacy_score numeric(5,1);

ALTER TABLE public.culture_interview_criteria_evaluations
  DROP CONSTRAINT IF EXISTS cice_confidence_level_check;
ALTER TABLE public.culture_interview_criteria_evaluations
  ADD CONSTRAINT cice_confidence_level_check
  CHECK (confidence_level IS NULL OR confidence_level IN ('low', 'medium', 'high'));

-- 4) Settings global (chave/valor) para controlar o flip do modo sombra
CREATE TABLE IF NOT EXISTS public.platform_evaluation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_evaluation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can read settings" ON public.platform_evaluation_settings;
CREATE POLICY "Super admins can read settings"
  ON public.platform_evaluation_settings FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can write settings" ON public.platform_evaluation_settings;
CREATE POLICY "Super admins can write settings"
  ON public.platform_evaluation_settings FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Seed: durante o período sombra, exibir score legado (antigo) ao recrutador.
-- Quando o usuário decidir virar a chave, basta UPDATE para 'new'.
INSERT INTO public.platform_evaluation_settings (key, value, description)
VALUES
  ('culture_evaluation_active_version', '"legacy"'::jsonb,
   'Qual versão da avaliação cultural é exibida ao recrutador. legacy = régua antiga (durante shadow). new = nova régua calibrada.'),
  ('culture_evaluation_shadow_enabled', 'true'::jsonb,
   'Quando true, sessões geram score legado e novo em paralelo.')
ON CONFLICT (key) DO NOTHING;
