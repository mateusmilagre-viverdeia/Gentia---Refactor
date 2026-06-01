-- Create development_sessions table
CREATE TABLE public.development_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stage INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create development_catalog table
CREATE TABLE public.development_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  category_label TEXT NOT NULL,
  category_icon TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create development_selections table
CREATE TABLE public.development_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.development_sessions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.development_catalog(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.development_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.development_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.development_selections ENABLE ROW LEVEL SECURITY;

-- RLS policies for development_sessions
CREATE POLICY "Users can view own sessions" ON public.development_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own sessions" ON public.development_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sessions" ON public.development_sessions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own sessions" ON public.development_sessions FOR DELETE USING (user_id = auth.uid());

-- RLS policy for development_catalog (public read)
CREATE POLICY "Anyone can read active catalog" ON public.development_catalog FOR SELECT USING (active = true);

-- RLS policies for development_selections
CREATE POLICY "Users can manage own selections" ON public.development_selections FOR ALL USING (
  EXISTS (SELECT 1 FROM public.development_sessions WHERE development_sessions.id = development_selections.session_id AND development_sessions.user_id = auth.uid())
);

-- Populate catalog with 50 rituals in 5 categories

-- CATEGORIA 1: Rituais de Crescimento Individual
INSERT INTO public.development_catalog (label, category, category_label, category_icon) VALUES
('Avaliação de desempenho', 'crescimento', 'Rituais de Crescimento Individual', '🌟'),
('Programa de Treinamento Contínuo', 'crescimento', 'Rituais de Crescimento Individual', '🌟'),
('Coaching individual', 'crescimento', 'Rituais de Crescimento Individual', '🌟'),
('Mentoria', 'crescimento', 'Rituais de Crescimento Individual', '🌟'),
('Biblioteca corporativa', 'crescimento', 'Rituais de Crescimento Individual', '🌟'),
('Workshops internos', 'crescimento', 'Rituais de Crescimento Individual', '🌟'),
('Programa de Desenvolvimento Individual (PDI)', 'crescimento', 'Rituais de Crescimento Individual', '🌟'),
('Método Cumbuca', 'crescimento', 'Rituais de Crescimento Individual', '🌟'),
('Rotação de Funções (Job Rotation Light)', 'crescimento', 'Rituais de Crescimento Individual', '🌟'),
('Duplas de Crescimento (Growth Buddies)', 'crescimento', 'Rituais de Crescimento Individual', '🌟');

-- CATEGORIA 2: Rituais de Liderança e Gestão
INSERT INTO public.development_catalog (label, category, category_label, category_icon) VALUES
('Conversas sobre visão, direção e estratégia', 'lideranca', 'Rituais de Liderança e Gestão', '👔'),
('Planejamento de Sucessão', 'lideranca', 'Rituais de Liderança e Gestão', '👔'),
('Delegação estruturada', 'lideranca', 'Rituais de Liderança e Gestão', '👔'),
('Feedbacks constantes', 'lideranca', 'Rituais de Liderança e Gestão', '👔'),
('Reuniões 1:1', 'lideranca', 'Rituais de Liderança e Gestão', '👔'),
('Painel de Decisões Difíceis', 'lideranca', 'Rituais de Liderança e Gestão', '👔'),
('Clínica de Liderança (Role Play)', 'lideranca', 'Rituais de Liderança e Gestão', '👔'),
('Ritual de Tomada de Decisão guiada por valores', 'lideranca', 'Rituais de Liderança e Gestão', '👔'),
('Shadowing (sombra de líder)', 'lideranca', 'Rituais de Liderança e Gestão', '👔'),
('Ritual de Tomada de Decisão Reversível vs. Irreversível', 'lideranca', 'Rituais de Liderança e Gestão', '👔');

-- CATEGORIA 3: Rituais de Cultura e Engajamento
INSERT INTO public.development_catalog (label, category, category_label, category_icon) VALUES
('Rituais de Gratidão', 'cultura', 'Rituais de Cultura e Engajamento', '💜'),
('Cerimônias de Reconhecimento', 'cultura', 'Rituais de Cultura e Engajamento', '💜'),
('Mérito / meritocracia', 'cultura', 'Rituais de Cultura e Engajamento', '💜'),
('Autonomia orientada por valores', 'cultura', 'Rituais de Cultura e Engajamento', '💜'),
('Círculo de Propósito', 'cultura', 'Rituais de Cultura e Engajamento', '💜'),
('Ritual da História do Cliente', 'cultura', 'Rituais de Cultura e Engajamento', '💜'),
('Mural de Reconhecimento (Kudos Wall)', 'cultura', 'Rituais de Cultura e Engajamento', '💜'),
('Ritual da Vitória Oculta', 'cultura', 'Rituais de Cultura e Engajamento', '💜'),
('Rituais de Conversas Difíceis', 'cultura', 'Rituais de Cultura e Engajamento', '💜'),
('Rituais de Ação de Graças Corporativa', 'cultura', 'Rituais de Cultura e Engajamento', '💜');

-- CATEGORIA 4: Rituais de Execução e Performance
INSERT INTO public.development_catalog (label, category, category_label, category_icon) VALUES
('Metas Individuais conectadas à meta da empresa', 'execucao', 'Rituais de Execução e Performance', '🚀'),
('Delegação de projetos estratégicos', 'execucao', 'Rituais de Execução e Performance', '🚀'),
('Reuniões diárias (daily)', 'execucao', 'Rituais de Execução e Performance', '🚀'),
('Reuniões semanais', 'execucao', 'Rituais de Execução e Performance', '🚀'),
('Reuniões periódicas de resultados', 'execucao', 'Rituais de Execução e Performance', '🚀'),
('Benchmarking', 'execucao', 'Rituais de Execução e Performance', '🚀'),
('After Action Review (Aprendizagem pós-projeto)', 'execucao', 'Rituais de Execução e Performance', '🚀'),
('Kaizen Diário (melhoria de 1%)', 'execucao', 'Rituais de Execução e Performance', '🚀'),
('Laboratório de Ideias (Innovation Hour)', 'execucao', 'Rituais de Execução e Performance', '🚀'),
('Ritual de Revisão de Processos pelos próprios usuários', 'execucao', 'Rituais de Execução e Performance', '🚀');

-- CATEGORIA 5: Rituais de Integração e Experiência
INSERT INTO public.development_catalog (label, category, category_label, category_icon) VALUES
('Onboarding estruturado', 'integracao', 'Rituais de Integração e Experiência', '🤝'),
('Integração interdepartamental trimestral', 'integracao', 'Rituais de Integração e Experiência', '🤝'),
('Programa de acolhimento de novos líderes', 'integracao', 'Rituais de Integração e Experiência', '🤝'),
('Semana Sem Reuniões (profundidade e foco)', 'integracao', 'Rituais de Integração e Experiência', '🤝'),
('Ritual da Prioridade Única da Semana', 'integracao', 'Rituais de Integração e Experiência', '🤝'),
('Ritual de Aprendizado Semanal', 'integracao', 'Rituais de Integração e Experiência', '🤝'),
('Reuniões de alinhamento de expectativas', 'integracao', 'Rituais de Integração e Experiência', '🤝'),
('Reuniões de cultura para reforço de valores', 'integracao', 'Rituais de Integração e Experiência', '🤝'),
('Programa de acompanhamento do primeiro trimestre', 'integracao', 'Rituais de Integração e Experiência', '🤝'),
('Rituais de celebração e datas comemorativas internas', 'integracao', 'Rituais de Integração e Experiência', '🤝');