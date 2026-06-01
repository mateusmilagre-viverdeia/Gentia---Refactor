-- Tabela de sessões de tomada de decisão
CREATE TABLE public.decision_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stage INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de respostas individuais
CREATE TABLE public.decision_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.decision_sessions(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  answer_text TEXT NOT NULL,
  is_suggestion BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.decision_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_answers ENABLE ROW LEVEL SECURITY;

-- RLS policies for decision_sessions
CREATE POLICY "Users can view own sessions"
ON public.decision_sessions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create own sessions"
ON public.decision_sessions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
ON public.decision_sessions FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions"
ON public.decision_sessions FOR DELETE
USING (user_id = auth.uid());

-- RLS policies for decision_answers
CREATE POLICY "Users can manage own answers"
ON public.decision_answers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.decision_sessions
    WHERE decision_sessions.id = decision_answers.session_id
    AND decision_sessions.user_id = auth.uid()
  )
);