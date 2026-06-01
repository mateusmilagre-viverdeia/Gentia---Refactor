-- Create mission_sessions table
CREATE TABLE public.mission_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stage INTEGER DEFAULT 1,
  answers JSONB DEFAULT '{}',
  analysis JSONB,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create mission_version_history table
CREATE TABLE public.mission_version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.mission_sessions(id) ON DELETE CASCADE,
  mission_statement TEXT NOT NULL,
  variant TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create vision_sessions table
CREATE TABLE public.vision_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stage INTEGER DEFAULT 1,
  answers JSONB DEFAULT '{}',
  analysis JSONB,
  notes TEXT DEFAULT '',
  selected_vision_type TEXT,
  final_vision TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create vision_version_history table
CREATE TABLE public.vision_version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.vision_sessions(id) ON DELETE CASCADE,
  vision_inspirational TEXT,
  vision_measurable TEXT,
  variant TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.mission_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_version_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_version_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for mission_sessions
CREATE POLICY "Users can view own mission sessions"
ON public.mission_sessions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create own mission sessions"
ON public.mission_sessions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own mission sessions"
ON public.mission_sessions FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own mission sessions"
ON public.mission_sessions FOR DELETE
USING (user_id = auth.uid());

-- RLS policies for mission_version_history
CREATE POLICY "Users can manage own mission history"
ON public.mission_version_history FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.mission_sessions
  WHERE mission_sessions.id = mission_version_history.session_id
  AND mission_sessions.user_id = auth.uid()
));

-- RLS policies for vision_sessions
CREATE POLICY "Users can view own vision sessions"
ON public.vision_sessions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create own vision sessions"
ON public.vision_sessions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own vision sessions"
ON public.vision_sessions FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own vision sessions"
ON public.vision_sessions FOR DELETE
USING (user_id = auth.uid());

-- RLS policies for vision_version_history
CREATE POLICY "Users can manage own vision history"
ON public.vision_version_history FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.vision_sessions
  WHERE vision_sessions.id = vision_version_history.session_id
  AND vision_sessions.user_id = auth.uid()
));

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_mission_sessions_updated_at
BEFORE UPDATE ON public.mission_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vision_sessions_updated_at
BEFORE UPDATE ON public.vision_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();