-- Threads
CREATE TABLE public.recruiter_copilot_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  scope TEXT NOT NULL CHECK (scope IN ('candidate','job','global')),
  candidate_id UUID,
  job_id UUID,
  title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_copilot_threads_account ON public.recruiter_copilot_threads(account_id);
CREATE INDEX idx_copilot_threads_scope ON public.recruiter_copilot_threads(account_id, scope, candidate_id, job_id) WHERE is_active = true;
CREATE INDEX idx_copilot_threads_user ON public.recruiter_copilot_threads(created_by);

-- Messages
CREATE TABLE public.recruiter_copilot_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.recruiter_copilot_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','tool','system')),
  content TEXT,
  tool_calls JSONB,
  tool_call_id TEXT,
  sources JSONB,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  credits_consumed NUMERIC(10,2) DEFAULT 0,
  model TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_copilot_messages_thread ON public.recruiter_copilot_messages(thread_id, created_at);

-- RLS
ALTER TABLE public.recruiter_copilot_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiter_copilot_messages ENABLE ROW LEVEL SECURITY;

-- Threads policies
CREATE POLICY "Members can view copilot threads"
  ON public.recruiter_copilot_threads FOR SELECT TO authenticated
  USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Members can create copilot threads"
  ON public.recruiter_copilot_threads FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id) OR is_super_admin(auth.uid()))
  );

CREATE POLICY "Members can update copilot threads"
  ON public.recruiter_copilot_threads FOR UPDATE TO authenticated
  USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Members can delete copilot threads"
  ON public.recruiter_copilot_threads FOR DELETE TO authenticated
  USING (is_account_member(auth.uid(), account_id) OR can_edit_client_project(auth.uid(), account_id) OR is_super_admin(auth.uid()));

-- Messages policies (joined through thread account)
CREATE POLICY "Members can view copilot messages"
  ON public.recruiter_copilot_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recruiter_copilot_threads t
      WHERE t.id = thread_id
        AND (is_account_member(auth.uid(), t.account_id) OR can_edit_client_project(auth.uid(), t.account_id) OR is_super_admin(auth.uid()))
    )
  );

CREATE POLICY "Members can insert copilot messages"
  ON public.recruiter_copilot_messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recruiter_copilot_threads t
      WHERE t.id = thread_id
        AND (is_account_member(auth.uid(), t.account_id) OR can_edit_client_project(auth.uid(), t.account_id) OR is_super_admin(auth.uid()))
    )
  );

-- Trigger for updated_at on threads
CREATE TRIGGER set_copilot_threads_updated_at
  BEFORE UPDATE ON public.recruiter_copilot_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();