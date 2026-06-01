-- 1. Valores Version History
CREATE TABLE public.values_version_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES values_sessions(id) ON DELETE CASCADE NOT NULL,
  snapshot jsonb NOT NULL,
  variant text NOT NULL DEFAULT 'original',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.values_version_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage values history" ON public.values_version_history FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM values_sessions 
    WHERE values_sessions.id = values_version_history.session_id
    AND is_account_member(auth.uid(), values_sessions.account_id)
  )
);

-- 2. Indicators Version History
CREATE TABLE public.indicators_version_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES strategic_indicators(id) ON DELETE CASCADE NOT NULL,
  snapshot jsonb NOT NULL,
  variant text NOT NULL DEFAULT 'original',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.indicators_version_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage indicators history" ON public.indicators_version_history FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM strategic_indicators 
    WHERE strategic_indicators.id = indicators_version_history.session_id
    AND is_account_member(auth.uid(), strategic_indicators.account_id)
  )
);

-- 3. Projects Version History
CREATE TABLE public.projects_version_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  snapshot jsonb NOT NULL,
  variant text NOT NULL DEFAULT 'original',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.projects_version_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage projects history" ON public.projects_version_history FOR ALL
USING (is_account_member(auth.uid(), account_id));

-- 4. Energy Version History
CREATE TABLE public.energy_version_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES energy_sessions(id) ON DELETE CASCADE NOT NULL,
  snapshot jsonb NOT NULL,
  variant text NOT NULL DEFAULT 'original',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.energy_version_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage energy history" ON public.energy_version_history FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM energy_sessions 
    WHERE energy_sessions.id = energy_version_history.session_id
    AND is_account_member(auth.uid(), energy_sessions.account_id)
  )
);

-- 5. Development Version History
CREATE TABLE public.development_version_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES development_sessions(id) ON DELETE CASCADE NOT NULL,
  snapshot jsonb NOT NULL,
  variant text NOT NULL DEFAULT 'original',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.development_version_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage development history" ON public.development_version_history FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM development_sessions 
    WHERE development_sessions.id = development_version_history.session_id
    AND is_account_member(auth.uid(), development_sessions.account_id)
  )
);

-- 6. Decision Version History
CREATE TABLE public.decision_version_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES decision_sessions(id) ON DELETE CASCADE NOT NULL,
  snapshot jsonb NOT NULL,
  variant text NOT NULL DEFAULT 'original',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.decision_version_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage decision history" ON public.decision_version_history FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM decision_sessions 
    WHERE decision_sessions.id = decision_version_history.session_id
    AND is_account_member(auth.uid(), decision_sessions.account_id)
  )
);

-- 7. Ritual Version History
CREATE TABLE public.ritual_version_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES ritual_sessions(id) ON DELETE CASCADE NOT NULL,
  snapshot jsonb NOT NULL,
  variant text NOT NULL DEFAULT 'original',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ritual_version_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage ritual history" ON public.ritual_version_history FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM ritual_sessions 
    WHERE ritual_sessions.id = ritual_version_history.session_id
    AND is_account_member(auth.uid(), ritual_sessions.account_id)
  )
);

-- 8. Event Version History
CREATE TABLE public.event_version_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES event_sessions(id) ON DELETE CASCADE NOT NULL,
  snapshot jsonb NOT NULL,
  variant text NOT NULL DEFAULT 'original',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.event_version_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage event history" ON public.event_version_history FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM event_sessions 
    WHERE event_sessions.id = event_version_history.session_id
    AND is_account_member(auth.uid(), event_sessions.account_id)
  )
);