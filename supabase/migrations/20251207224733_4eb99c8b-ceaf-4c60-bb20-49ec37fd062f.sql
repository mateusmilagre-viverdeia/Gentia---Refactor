-- Create ritual_sessions table
CREATE TABLE public.ritual_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stage INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ritual_items table
CREATE TABLE public.ritual_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ritual_sessions(id) ON DELETE CASCADE,
  pillar_number INTEGER NOT NULL,
  item_text TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ritual_suggestions_catalog table
CREATE TABLE public.ritual_suggestions_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pillar_number INTEGER NOT NULL,
  suggestion_text TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ritual_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ritual_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ritual_suggestions_catalog ENABLE ROW LEVEL SECURITY;

-- RLS policies for ritual_sessions
CREATE POLICY "Users can view own sessions" ON public.ritual_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own sessions" ON public.ritual_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sessions" ON public.ritual_sessions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own sessions" ON public.ritual_sessions FOR DELETE USING (user_id = auth.uid());

-- RLS policies for ritual_items
CREATE POLICY "Users can manage own items" ON public.ritual_items FOR ALL USING (
  EXISTS (SELECT 1 FROM ritual_sessions WHERE ritual_sessions.id = ritual_items.session_id AND ritual_sessions.user_id = auth.uid())
);

-- RLS policies for ritual_suggestions_catalog (public read)
CREATE POLICY "Anyone can read active suggestions" ON public.ritual_suggestions_catalog FOR SELECT USING (active = true);

-- Insert initial suggestions for Pilar 1 - Artefatos (reusing from event catalog)
INSERT INTO public.ritual_suggestions_catalog (pillar_number, suggestion_text) VALUES
(1, 'Backdrop/painel com missão, visão e valores da empresa'),
(1, 'Linha do tempo visual da história da empresa'),
(1, 'Sino da cultura para celebrar conquistas'),
(1, 'Árvore da cultura interativa com folhas representando valores'),
(1, 'Manifesto da cultura impresso em formato poster'),
(1, 'Camisetas personalizadas com elementos da cultura'),
(1, 'Pins/bottons representando cada valor'),
(1, 'QR codes espalhados com vídeos de líderes explicando valores'),
(1, 'Quadro de reconhecimento de colaboradores que vivem a cultura'),
(1, 'Totens interativos com quiz sobre a cultura'),
(1, 'Mural de fotos de momentos marcantes da empresa'),
(1, 'Bandeiras ou banners com frases inspiradoras da cultura'),
(1, 'Cadernos/agendas personalizadas com a cultura'),
(1, 'Canecas com valores ou frases da missão'),
(1, 'Adesivos de notebook com elementos culturais'),
(1, 'Placas de mesa com o valor do mês'),
(1, 'Relógio de parede personalizado com marcos da empresa'),
(1, 'Tapete de entrada com mensagem de boas-vindas cultural'),
(1, 'Quadros com definições dos valores em cada sala'),
(1, 'Uniforme ou dress code alinhado com a cultura'),
(1, 'Playlist ambiente que reflita a energia da cultura'),
(1, 'Aromas/essências que remetam à identidade da empresa'),
(1, 'Troféus ou prêmios de reconhecimento cultural'),
(1, 'Biblioteca física com livros sobre cultura e valores'),
(1, 'Mascote da empresa que represente a cultura'),
(1, 'Arte nas paredes que conte a história da empresa');

-- Insert initial suggestions for Pilar 2 - Tomada de Decisão
INSERT INTO public.ritual_suggestions_catalog (pillar_number, suggestion_text) VALUES
(2, 'O que é intolerável na nossa cultura?'),
(2, 'Quais as regras inegociáveis da empresa?'),
(2, 'Quais critérios usamos para tomar decisões importantes?'),
(2, 'Por quais motivos demitimos pessoas?'),
(2, 'Por quais motivos contratamos pessoas?'),
(2, 'Por quais motivos promovemos pessoas?'),
(2, 'Como tomamos decisões na empresa de forma geral?'),
(2, 'Esta decisão está alinhada com nossa missão?'),
(2, 'Esta decisão reflete nossos valores?'),
(2, 'Como isso impacta nossos clientes?'),
(2, 'Estamos sendo fiéis à nossa visão de futuro?'),
(2, 'Qual valor está guiando esta decisão?'),
(2, 'Isso fortalece ou enfraquece nossa cultura?'),
(2, 'Como explicaríamos esta decisão para toda a empresa?'),
(2, 'Esta é uma decisão que nos orgulhamos?'),
(2, 'Checklist de valores antes de decisões importantes'),
(2, 'Comitê de cultura para decisões estratégicas'),
(2, 'Votação baseada em critérios culturais');