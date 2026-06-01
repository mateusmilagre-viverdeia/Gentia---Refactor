-- Sessão do evento (dados gerais + formato)
CREATE TABLE public.event_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_format TEXT, -- 'presencial', 'online', 'hibrido' (NULL until selected)
  stage INTEGER NOT NULL DEFAULT 0, -- 0=pergunta inicial, 1-9=pilares, 10=revisão, 11=sumário
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own sessions" ON public.event_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own sessions" ON public.event_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sessions" ON public.event_sessions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own sessions" ON public.event_sessions FOR DELETE USING (user_id = auth.uid());

-- Itens/ideias por pilar
CREATE TABLE public.event_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.event_sessions(id) ON DELETE CASCADE,
  pillar_number INTEGER NOT NULL CHECK (pillar_number >= 1 AND pillar_number <= 9),
  item_text TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('ai', 'suggestion', 'custom')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies (via session ownership)
CREATE POLICY "Users can manage own items" ON public.event_items FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.event_sessions 
  WHERE event_sessions.id = event_items.session_id 
  AND event_sessions.user_id = auth.uid()
));

-- Catálogo de sugestões pré-definidas
CREATE TABLE public.event_suggestions_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_number INTEGER NOT NULL CHECK (pillar_number >= 1 AND pillar_number <= 9),
  suggestion_text TEXT NOT NULL,
  event_format TEXT CHECK (event_format IS NULL OR event_format IN ('presencial', 'online', 'hibrido')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_suggestions_catalog ENABLE ROW LEVEL SECURITY;

-- Anyone can read active suggestions
CREATE POLICY "Anyone can read active suggestions" ON public.event_suggestions_catalog FOR SELECT USING (active = true);