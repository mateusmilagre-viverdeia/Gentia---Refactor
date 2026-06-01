
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail TEXT,
  duration_minutes INT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read courses" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read lessons" ON public.lessons FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins manage courses" ON public.courses FOR ALL USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins manage lessons" ON public.lessons FOR ALL USING (public.is_super_admin(auth.uid()));
