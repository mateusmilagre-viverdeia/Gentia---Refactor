
-- Create ENUMs for onboarding system
CREATE TYPE public.onboarding_responsible_type AS ENUM ('rh', 'leader', 'employee');
CREATE TYPE public.onboarding_status AS ENUM ('draft', 'active', 'completed', 'cancelled');
CREATE TYPE public.onboarding_task_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped');
CREATE TYPE public.onboarding_phase_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE public.onboarding_recommendation AS ENUM ('efetivado', 'estender_onboarding', 'desligamento');

-- 1. Templates de Onboarding (modelos reutilizáveis)
CREATE TABLE public.onboarding_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_duration_days INTEGER NOT NULL DEFAULT 90,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Fases dos Templates
CREATE TABLE public.onboarding_template_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.onboarding_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tarefas dos Templates
CREATE TABLE public.onboarding_template_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES public.onboarding_template_phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  responsible_type public.onboarding_responsible_type NOT NULL DEFAULT 'leader',
  is_required BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Processos de Onboarding (um por colaborador)
CREATE TABLE public.onboarding_processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_name TEXT NOT NULL,
  employee_email TEXT,
  employee_role TEXT,
  employee_department TEXT,
  leader_id UUID REFERENCES auth.users(id),
  leader_name TEXT,
  hr_responsible_id UUID REFERENCES auth.users(id),
  hr_responsible_name TEXT,
  template_id UUID REFERENCES public.onboarding_templates(id),
  status public.onboarding_status NOT NULL DEFAULT 'draft',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  success_metrics TEXT[],
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Fases do Processo de Onboarding
CREATE TABLE public.onboarding_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.onboarding_processes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  status public.onboarding_phase_status NOT NULL DEFAULT 'pending',
  start_date DATE,
  end_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Tarefas do Processo de Onboarding
CREATE TABLE public.onboarding_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES public.onboarding_phases(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES public.onboarding_processes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  responsible_type public.onboarding_responsible_type NOT NULL DEFAULT 'leader',
  responsible_id UUID REFERENCES auth.users(id),
  responsible_name TEXT,
  status public.onboarding_task_status NOT NULL DEFAULT 'pending',
  is_required BOOLEAN NOT NULL DEFAULT true,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Avaliações Finais do Onboarding
CREATE TABLE public.onboarding_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.onboarding_processes(id) ON DELETE CASCADE UNIQUE,
  evaluator_id UUID REFERENCES auth.users(id),
  evaluator_name TEXT,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  recommendation public.onboarding_recommendation NOT NULL,
  strengths TEXT,
  areas_for_improvement TEXT,
  additional_notes TEXT,
  metrics_achieved JSONB,
  evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_template_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates (viewable by all authenticated, manageable by creators)
CREATE POLICY "Templates are viewable by authenticated users" ON public.onboarding_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create templates" ON public.onboarding_templates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their templates" ON public.onboarding_templates
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their templates" ON public.onboarding_templates
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- RLS for template phases
CREATE POLICY "Template phases are viewable by authenticated users" ON public.onboarding_template_phases
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage template phases" ON public.onboarding_template_phases
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.onboarding_templates t WHERE t.id = template_id AND t.created_by = auth.uid())
  );

-- RLS for template tasks
CREATE POLICY "Template tasks are viewable by authenticated users" ON public.onboarding_template_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage template tasks" ON public.onboarding_template_tasks
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_template_phases p 
      JOIN public.onboarding_templates t ON t.id = p.template_id 
      WHERE p.id = phase_id AND t.created_by = auth.uid()
    )
  );

-- RLS for processes (viewable by involved parties)
CREATE POLICY "Processes are viewable by involved users" ON public.onboarding_processes
  FOR SELECT TO authenticated USING (
    auth.uid() = created_by OR 
    auth.uid() = leader_id OR 
    auth.uid() = hr_responsible_id
  );

CREATE POLICY "Users can create processes" ON public.onboarding_processes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Involved users can update processes" ON public.onboarding_processes
  FOR UPDATE TO authenticated USING (
    auth.uid() = created_by OR 
    auth.uid() = leader_id OR 
    auth.uid() = hr_responsible_id
  );

-- RLS for phases
CREATE POLICY "Phases are viewable by process participants" ON public.onboarding_phases
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_processes p 
      WHERE p.id = process_id AND (
        auth.uid() = p.created_by OR 
        auth.uid() = p.leader_id OR 
        auth.uid() = p.hr_responsible_id
      )
    )
  );

CREATE POLICY "Participants can manage phases" ON public.onboarding_phases
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_processes p 
      WHERE p.id = process_id AND (
        auth.uid() = p.created_by OR 
        auth.uid() = p.leader_id OR 
        auth.uid() = p.hr_responsible_id
      )
    )
  );

-- RLS for tasks
CREATE POLICY "Tasks are viewable by process participants" ON public.onboarding_tasks
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_processes p 
      WHERE p.id = process_id AND (
        auth.uid() = p.created_by OR 
        auth.uid() = p.leader_id OR 
        auth.uid() = p.hr_responsible_id
      )
    )
  );

CREATE POLICY "Participants can manage tasks" ON public.onboarding_tasks
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_processes p 
      WHERE p.id = process_id AND (
        auth.uid() = p.created_by OR 
        auth.uid() = p.leader_id OR 
        auth.uid() = p.hr_responsible_id
      )
    )
  );

-- RLS for evaluations
CREATE POLICY "Evaluations are viewable by process participants" ON public.onboarding_evaluations
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_processes p 
      WHERE p.id = process_id AND (
        auth.uid() = p.created_by OR 
        auth.uid() = p.leader_id OR 
        auth.uid() = p.hr_responsible_id
      )
    )
  );

CREATE POLICY "Participants can create evaluations" ON public.onboarding_evaluations
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.onboarding_processes p 
      WHERE p.id = process_id AND (
        auth.uid() = p.created_by OR 
        auth.uid() = p.leader_id OR 
        auth.uid() = p.hr_responsible_id
      )
    )
  );

-- Create indexes for performance
CREATE INDEX idx_onboarding_template_phases_template ON public.onboarding_template_phases(template_id);
CREATE INDEX idx_onboarding_template_tasks_phase ON public.onboarding_template_tasks(phase_id);
CREATE INDEX idx_onboarding_processes_status ON public.onboarding_processes(status);
CREATE INDEX idx_onboarding_processes_leader ON public.onboarding_processes(leader_id);
CREATE INDEX idx_onboarding_processes_hr ON public.onboarding_processes(hr_responsible_id);
CREATE INDEX idx_onboarding_phases_process ON public.onboarding_phases(process_id);
CREATE INDEX idx_onboarding_tasks_process ON public.onboarding_tasks(process_id);
CREATE INDEX idx_onboarding_tasks_phase ON public.onboarding_tasks(phase_id);
CREATE INDEX idx_onboarding_tasks_status ON public.onboarding_tasks(status);
CREATE INDEX idx_onboarding_evaluations_process ON public.onboarding_evaluations(process_id);

-- Create trigger for updated_at
CREATE TRIGGER update_onboarding_templates_updated_at
  BEFORE UPDATE ON public.onboarding_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboarding_processes_updated_at
  BEFORE UPDATE ON public.onboarding_processes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboarding_tasks_updated_at
  BEFORE UPDATE ON public.onboarding_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
