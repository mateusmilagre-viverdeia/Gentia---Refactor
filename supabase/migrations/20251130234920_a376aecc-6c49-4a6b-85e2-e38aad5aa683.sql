-- Create enum for better type safety
CREATE TYPE public.values_phase AS ENUM ('phase_1', 'phase_2', 'phase_3');

-- 1. Catálogo de valores organizacionais
CREATE TABLE public.values_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Sessões de valores do usuário
CREATE TABLE public.values_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stage INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Seleções por fase (phase 1=20, 2=10, 3=5)
CREATE TABLE public.values_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.values_sessions(id) ON DELETE CASCADE,
  value_id UUID REFERENCES public.values_catalog(id),
  phase INTEGER NOT NULL CHECK (phase IN (1, 2, 3)),
  position INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, value_id, phase)
);

-- 4. Informações da empresa
CREATE TABLE public.values_company_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.values_sessions(id) ON DELETE CASCADE UNIQUE,
  company_name TEXT NOT NULL,
  user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Respostas abertas
CREATE TABLE public.values_open_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.values_sessions(id) ON DELETE CASCADE UNIQUE,
  intolerable TEXT,
  expectations TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Ratings/avaliações
CREATE TABLE public.values_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.values_sessions(id) ON DELETE CASCADE,
  value_id UUID REFERENCES public.values_catalog(id),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  valid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, value_id)
);

-- 7. Check final
CREATE TABLE public.values_final_check (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.values_sessions(id) ON DELETE CASCADE UNIQUE,
  percent_resolved INTEGER NOT NULL CHECK (percent_resolved >= 0 AND percent_resolved <= 100),
  passed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Opções de comportamentos (geradas pela IA)
CREATE TABLE public.values_behaviors_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.values_sessions(id) ON DELETE CASCADE,
  value_label TEXT NOT NULL,
  dos TEXT[] DEFAULT '{}',
  donts TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, value_label)
);

-- 9. Seleções de comportamentos (escolhidos pelo usuário)
CREATE TABLE public.values_behaviors_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.values_sessions(id) ON DELETE CASCADE,
  value_label TEXT NOT NULL,
  do_selected TEXT[] DEFAULT '{}',
  dont_selected TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, value_label)
);

-- Popular catálogo com ~50 valores
INSERT INTO public.values_catalog (label) VALUES
('Integridade'), ('Honestidade'), ('Transparência'), ('Ética'), ('Responsabilidade'),
('Respeito'), ('Colaboração'), ('Trabalho em equipe'), ('Empatia'), ('Diversidade'),
('Inclusão'), ('Excelência'), ('Qualidade'), ('Melhoria contínua'), ('Comprometimento'),
('Foco no cliente'), ('Inovação'), ('Criatividade'), ('Agilidade'), ('Adaptabilidade'),
('Ousadia'), ('Coragem'), ('Determinação'), ('Perseverança'), ('Paixão'),
('Confiança'), ('Lealdade'), ('Humildade'), ('Simplicidade'), ('Sustentabilidade'),
('Autonomia'), ('Proatividade'), ('Resultado'), ('Eficiência'), ('Produtividade'),
('Aprendizado'), ('Crescimento'), ('Desenvolvimento'), ('Liderança'), ('Comunicação'),
('Reconhecimento'), ('Meritocracia'), ('Justiça'), ('Equilíbrio'), ('Bem-estar'),
('Segurança'), ('Organização'), ('Planejamento'), ('Disciplina'), ('Foco');

-- Enable RLS
ALTER TABLE public.values_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.values_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.values_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.values_company_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.values_open_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.values_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.values_final_check ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.values_behaviors_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.values_behaviors_selections ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Catálogo público para leitura
CREATE POLICY "Anyone can read active values catalog" 
ON public.values_catalog
FOR SELECT 
TO authenticated 
USING (active = true);

-- Sessões: usuários gerenciam suas próprias
CREATE POLICY "Users can view own sessions" 
ON public.values_sessions
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Users can create own sessions" 
ON public.values_sessions
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions" 
ON public.values_sessions
FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions" 
ON public.values_sessions
FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());

-- Seleções: baseadas na sessão do usuário
CREATE POLICY "Users can manage own selections" 
ON public.values_selections
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.values_sessions 
    WHERE id = values_selections.session_id 
    AND user_id = auth.uid()
  )
);

-- Informações da empresa
CREATE POLICY "Users can manage own company info" 
ON public.values_company_info
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.values_sessions 
    WHERE id = values_company_info.session_id 
    AND user_id = auth.uid()
  )
);

-- Respostas abertas
CREATE POLICY "Users can manage own open answers" 
ON public.values_open_answers
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.values_sessions 
    WHERE id = values_open_answers.session_id 
    AND user_id = auth.uid()
  )
);

-- Ratings
CREATE POLICY "Users can manage own ratings" 
ON public.values_ratings
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.values_sessions 
    WHERE id = values_ratings.session_id 
    AND user_id = auth.uid()
  )
);

-- Check final
CREATE POLICY "Users can manage own final check" 
ON public.values_final_check
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.values_sessions 
    WHERE id = values_final_check.session_id 
    AND user_id = auth.uid()
  )
);

-- Opções de comportamentos
CREATE POLICY "Users can manage own behavior options" 
ON public.values_behaviors_options
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.values_sessions 
    WHERE id = values_behaviors_options.session_id 
    AND user_id = auth.uid()
  )
);

-- Seleções de comportamentos
CREATE POLICY "Users can manage own behavior selections" 
ON public.values_behaviors_selections
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.values_sessions 
    WHERE id = values_behaviors_selections.session_id 
    AND user_id = auth.uid()
  )
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_values_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_values_sessions_updated_at_trigger
BEFORE UPDATE ON public.values_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_values_sessions_updated_at();