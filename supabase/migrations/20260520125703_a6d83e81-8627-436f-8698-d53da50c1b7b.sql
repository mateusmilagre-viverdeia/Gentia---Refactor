CREATE TABLE IF NOT EXISTS public.voice_interview_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  account_id uuid NOT NULL,
  agent_id uuid,
  triggered_by uuid NOT NULL,
  persona text NOT NULL DEFAULT 'balanced',
  status text NOT NULL DEFAULT 'running',
  questions_total integer NOT NULL DEFAULT 0,
  questions_covered integer NOT NULL DEFAULT 0,
  adherence_score numeric,
  turns_count integer NOT NULL DEFAULT 0,
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  coverage_map jsonb NOT NULL DEFAULT '[]'::jsonb,
  deviations jsonb NOT NULL DEFAULT '[]'::jsonb,
  duration_ms integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_vis_job ON public.voice_interview_simulations(job_id);
CREATE INDEX IF NOT EXISTS idx_vis_triggered_by ON public.voice_interview_simulations(triggered_by);
CREATE INDEX IF NOT EXISTS idx_vis_created_at ON public.voice_interview_simulations(created_at DESC);

ALTER TABLE public.voice_interview_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all simulations"
ON public.voice_interview_simulations
FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert simulations"
ON public.voice_interview_simulations
FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update simulations"
ON public.voice_interview_simulations
FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()));