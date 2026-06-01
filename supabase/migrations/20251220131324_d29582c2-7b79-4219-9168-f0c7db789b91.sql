-- =============================================
-- GAMIFICATION SYSTEM TABLES
-- =============================================

-- 1. Badges disponíveis no sistema
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('phase', 'milestone', 'performance', 'special')),
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  points INTEGER NOT NULL DEFAULT 0,
  requirement JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Badges conquistados pelo usuário
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  seen BOOLEAN DEFAULT false,
  UNIQUE(user_id, badge_id)
);

-- 3. Estatísticas de gamificação por company
CREATE TABLE public.company_gamification_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  badges_earned INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Progresso por etapa/seção
CREATE TABLE public.journey_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  journey_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'in_progress', 'completed', 'skipped')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  completed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, journey_id, step_id)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX idx_user_badges_account_id ON public.user_badges(account_id);
CREATE INDEX idx_user_badges_unseen ON public.user_badges(user_id, seen) WHERE seen = false;
CREATE INDEX idx_journey_progress_account ON public.journey_progress(account_id);
CREATE INDEX idx_journey_progress_status ON public.journey_progress(account_id, status);
CREATE INDEX idx_company_gamification_stats_account ON public.company_gamification_stats(account_id);

-- =============================================
-- TRIGGERS FOR updated_at
-- =============================================
CREATE TRIGGER update_company_gamification_stats_updated_at
  BEFORE UPDATE ON public.company_gamification_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journey_progress_updated_at
  BEFORE UPDATE ON public.journey_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Badges table (public read)
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges are viewable by everyone"
  ON public.badges FOR SELECT
  USING (true);

-- User badges table
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own badges"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own badges"
  ON public.user_badges FOR UPDATE
  USING (auth.uid() = user_id);

-- Company gamification stats table
ALTER TABLE public.company_gamification_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stats for their company"
  ON public.company_gamification_stats FOR SELECT
  USING (
    account_id IN (
      SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert stats for their company"
  ON public.company_gamification_stats FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can update stats for their company"
  ON public.company_gamification_stats FOR UPDATE
  USING (
    account_id IN (
      SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Journey progress table
ALTER TABLE public.journey_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view progress for their company"
  ON public.journey_progress FOR SELECT
  USING (
    account_id IN (
      SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert progress for their company"
  ON public.journey_progress FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can update progress for their company"
  ON public.journey_progress FOR UPDATE
  USING (
    account_id IN (
      SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete progress for their company"
  ON public.journey_progress FOR DELETE
  USING (
    account_id IN (
      SELECT p.account_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- =============================================
-- INSERT INITIAL BADGES
-- =============================================

INSERT INTO public.badges (name, description, icon, category, tier, points, requirement) VALUES
-- Phase badges
('Primeiro Passo', 'Completou sua primeira etapa na plataforma', '🏁', 'phase', 'bronze', 50, '{"type": "first_step"}'),
('Missão Definida', 'Definiu a Missão da empresa', '🎯', 'phase', 'silver', 100, '{"type": "step_complete", "step": "missao"}'),
('Visionário', 'Criou a Visão de futuro da empresa', '👁️', 'phase', 'silver', 100, '{"type": "step_complete", "step": "visao"}'),
('Valores Claros', 'Definiu os Valores organizacionais', '⭐', 'phase', 'silver', 100, '{"type": "step_complete", "step": "valores"}'),
('Energizado', 'Completou o mapeamento de Energia', '⚡', 'phase', 'bronze', 75, '{"type": "step_complete", "step": "energia"}'),
('Em Desenvolvimento', 'Completou o mapeamento de Desenvolvimento', '📈', 'phase', 'bronze', 75, '{"type": "step_complete", "step": "desenvolvimento"}'),
('Decisor', 'Definiu o modelo de Decisão', '⚖️', 'phase', 'silver', 100, '{"type": "step_complete", "step": "decisao"}'),
('Estrategista', 'Definiu os Indicadores estratégicos', '📊', 'phase', 'gold', 150, '{"type": "step_complete", "step": "indicadores"}'),
('Executor', 'Planejou os Projetos estratégicos', '🚀', 'phase', 'gold', 150, '{"type": "step_complete", "step": "projetos"}'),
-- Milestone badges
('Cultura Completa', 'Completou todos os 8 pilares de cultura', '🏆', 'milestone', 'platinum', 500, '{"type": "journey_complete", "journey": "cultura"}'),
('Atração Completa', 'Configurou todo o sistema de atração', '🎪', 'milestone', 'gold', 300, '{"type": "journey_complete", "journey": "atracao"}'),
('Diagnóstico Completo', 'Finalizou todo o diagnóstico', '🔬', 'milestone', 'silver', 200, '{"type": "journey_complete", "journey": "diagnostico"}'),
('Metade do Caminho', 'Atingiu 50% do progresso total', '🛤️', 'milestone', 'silver', 150, '{"type": "overall_progress", "min": 50}'),
('Quase Lá', 'Atingiu 90% do progresso total', '🏁', 'milestone', 'gold', 250, '{"type": "overall_progress", "min": 90}'),
('Jornada Completa', 'Completou 100% da plataforma', '👑', 'milestone', 'platinum', 1000, '{"type": "overall_progress", "min": 100}'),
-- Performance badges
('Streak 7 Dias', 'Usou a plataforma por 7 dias consecutivos', '🔥', 'performance', 'bronze', 100, '{"type": "streak", "days": 7}'),
('Streak 30 Dias', 'Usou a plataforma por 30 dias consecutivos', '💎', 'performance', 'silver', 300, '{"type": "streak", "days": 30}'),
('Streak 90 Dias', 'Usou a plataforma por 90 dias consecutivos', '🌟', 'performance', 'gold', 500, '{"type": "streak", "days": 90}'),
('Madrugador', 'Acessou antes das 7h da manhã', '🌅', 'performance', 'bronze', 25, '{"type": "time_access", "before": "07:00"}'),
('Coruja', 'Acessou depois das 22h', '🦉', 'performance', 'bronze', 25, '{"type": "time_access", "after": "22:00"}'),
-- Special badges
('Pioneiro', 'Um dos primeiros usuários da plataforma', '🌱', 'special', 'platinum', 200, '{"type": "early_adopter"}'),
('Explorador', 'Visitou todas as páginas da plataforma', '🗺️', 'special', 'silver', 100, '{"type": "all_pages_visited"}'),
('Mestre da IA', 'Usou todas as funcionalidades de IA', '🤖', 'special', 'gold', 250, '{"type": "all_ai_features"}'),
('Feedback Champion', 'Deu feedback sobre a plataforma', '💬', 'special', 'bronze', 50, '{"type": "gave_feedback"}'),
('Embaixador', 'Convidou um colega para a plataforma', '🤝', 'special', 'silver', 150, '{"type": "invited_user"}');