-- Create energy_sessions table
CREATE TABLE public.energy_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stage INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.energy_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for energy_sessions
CREATE POLICY "Users can view own sessions" ON public.energy_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own sessions" ON public.energy_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sessions" ON public.energy_sessions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own sessions" ON public.energy_sessions FOR DELETE USING (user_id = auth.uid());

-- Create energy_catalog table
CREATE TABLE public.energy_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  category_label TEXT NOT NULL,
  category_icon TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.energy_catalog ENABLE ROW LEVEL SECURITY;

-- RLS policy for energy_catalog (read-only for active items)
CREATE POLICY "Anyone can read active catalog" ON public.energy_catalog FOR SELECT USING (active = true);

-- Create energy_selections table
CREATE TABLE public.energy_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  item_id UUID NOT NULL,
  phase INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.energy_selections ENABLE ROW LEVEL SECURITY;

-- RLS policy for energy_selections
CREATE POLICY "Users can manage own selections" ON public.energy_selections FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.energy_sessions 
  WHERE energy_sessions.id = energy_selections.session_id 
  AND energy_sessions.user_id = auth.uid()
));

-- Populate energy_catalog with 31 rituals

-- 🔥 Reconhecimento e Valorização Humana (8)
INSERT INTO public.energy_catalog (label, category, category_label, category_icon) VALUES
('Reconhecimento público', 'reconhecimento', 'Rituais de Reconhecimento e Valorização Humana', '🔥'),
('Ritual da Gratidão', 'reconhecimento', 'Rituais de Reconhecimento e Valorização Humana', '🔥'),
('Comemorando pequenas vitórias', 'reconhecimento', 'Rituais de Reconhecimento e Valorização Humana', '🔥'),
('Bônus por resultado', 'reconhecimento', 'Rituais de Reconhecimento e Valorização Humana', '🔥'),
('Ambientes meritocráticos', 'reconhecimento', 'Rituais de Reconhecimento e Valorização Humana', '🔥'),
('Sino quando sai venda', 'reconhecimento', 'Rituais de Reconhecimento e Valorização Humana', '🔥'),
('Confraternização quando bate meta', 'reconhecimento', 'Rituais de Reconhecimento e Valorização Humana', '🔥'),
('Day off quando bate meta', 'reconhecimento', 'Rituais de Reconhecimento e Valorização Humana', '🔥');

-- 🧠 Cultura Positiva e Pertencimento (9)
INSERT INTO public.energy_catalog (label, category, category_label, category_icon) VALUES
('Grito de guerra', 'cultura', 'Rituais de Cultura Positiva e Pertencimento', '🧠'),
('Relacionar-se com pessoas que gostamos', 'cultura', 'Rituais de Cultura Positiva e Pertencimento', '🧠'),
('Ambiente descontraído', 'cultura', 'Rituais de Cultura Positiva e Pertencimento', '🧠'),
('Happy Hours', 'cultura', 'Rituais de Cultura Positiva e Pertencimento', '🧠'),
('Confraternização anual', 'cultura', 'Rituais de Cultura Positiva e Pertencimento', '🧠'),
('Reunião de abertura matinal', 'cultura', 'Rituais de Cultura Positiva e Pertencimento', '🧠'),
('Confiança mútua', 'cultura', 'Rituais de Cultura Positiva e Pertencimento', '🧠'),
('Não microgerenciar', 'cultura', 'Rituais de Cultura Positiva e Pertencimento', '🧠'),
('Autonomia ao time', 'cultura', 'Rituais de Cultura Positiva e Pertencimento', '🧠');

-- 🚀 Performance Saudável e Alta Energia (6)
INSERT INTO public.energy_catalog (label, category, category_label, category_icon) VALUES
('Incentivo a exercício físico', 'performance', 'Rituais de Performance Saudável e Alta Energia', '🚀'),
('Incentivo à alimentação saudável', 'performance', 'Rituais de Performance Saudável e Alta Energia', '🚀'),
('Snacks e pausas saudáveis', 'performance', 'Rituais de Performance Saudável e Alta Energia', '🚀'),
('Meditação', 'performance', 'Rituais de Performance Saudável e Alta Energia', '🚀'),
('Games nos intervalos', 'performance', 'Rituais de Performance Saudável e Alta Energia', '🚀'),
('Absorção de novos conhecimentos', 'performance', 'Rituais de Performance Saudável e Alta Energia', '🚀');

-- 🧩 Trabalho Inteligente e Produtividade Sustentável (4)
INSERT INTO public.energy_catalog (label, category, category_label, category_icon) VALUES
('Delegação de tarefas e desafios', 'trabalho', 'Rituais de Trabalho Inteligente e Produtividade', '🧩'),
('Home office', 'trabalho', 'Rituais de Trabalho Inteligente e Produtividade', '🧩'),
('Modelo híbrido', 'trabalho', 'Rituais de Trabalho Inteligente e Produtividade', '🧩'),
('Short Friday', 'trabalho', 'Rituais de Trabalho Inteligente e Produtividade', '🧩');

-- 🌱 Impacto, Propósito e Bem-Estar Ampliado (4)
INSERT INTO public.energy_catalog (label, category, category_label, category_icon) VALUES
('Day off no aniversário', 'impacto', 'Rituais de Impacto, Propósito e Bem-Estar', '🌱'),
('Praticamos ações sociais', 'impacto', 'Rituais de Impacto, Propósito e Bem-Estar', '🌱'),
('Incentivo ao voluntariado interno', 'impacto', 'Rituais de Impacto, Propósito e Bem-Estar', '🌱'),
('Construir significado através de projetos úteis', 'impacto', 'Rituais de Impacto, Propósito e Bem-Estar', '🌱');