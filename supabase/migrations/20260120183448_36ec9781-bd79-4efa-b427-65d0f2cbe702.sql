-- Create project_health_scores table for automatic health tracking
CREATE TABLE public.project_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Score Components (0-100 each)
  progress_score INTEGER NOT NULL DEFAULT 0 CHECK (progress_score >= 0 AND progress_score <= 100),
  engagement_score INTEGER NOT NULL DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  velocity_score INTEGER NOT NULL DEFAULT 0 CHECK (velocity_score >= 0 AND velocity_score <= 100),
  action_score INTEGER NOT NULL DEFAULT 0 CHECK (action_score >= 0 AND action_score <= 100),
  
  -- Final Weighted Score
  health_score INTEGER NOT NULL DEFAULT 0 CHECK (health_score >= 0 AND health_score <= 100),
  health_status TEXT NOT NULL DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'at_risk', 'critical', 'unknown')),
  
  -- Metadata
  last_checkpoint_date DATE,
  last_activity_date DATE,
  days_since_last_activity INTEGER DEFAULT 0,
  pending_actions_count INTEGER DEFAULT 0,
  completed_actions_count INTEGER DEFAULT 0,
  
  -- Timestamps
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(account_id)
);

-- Create index for faster queries
CREATE INDEX idx_project_health_scores_account ON public.project_health_scores(account_id);
CREATE INDEX idx_project_health_scores_status ON public.project_health_scores(health_status);
CREATE INDEX idx_project_health_scores_score ON public.project_health_scores(health_score DESC);

-- Enable RLS
ALTER TABLE public.project_health_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies: EP Team and Account Members can view
CREATE POLICY "EP Team can view all health scores"
ON public.project_health_scores
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ep_consultants ec
    WHERE ec.user_id = auth.uid() AND ec.active = true
  )
);

CREATE POLICY "EP Team can manage health scores"
ON public.project_health_scores
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.ep_consultants ec
    WHERE ec.user_id = auth.uid() AND ec.active = true
  )
);

CREATE POLICY "Account members can view their health score"
ON public.project_health_scores
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.user_id = auth.uid() 
    AND am.account_id = project_health_scores.account_id
    AND am.is_active = true
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_project_health_scores_updated_at
BEFORE UPDATE ON public.project_health_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create project_milestones table for timeline tracking
CREATE TABLE public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Milestone Identification
  pillar TEXT,
  milestone_name TEXT NOT NULL,
  milestone_type TEXT NOT NULL DEFAULT 'pillar' CHECK (milestone_type IN ('pillar', 'checkpoint', 'custom', 'phase')),
  description TEXT,
  
  -- Dates
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  
  -- Status and Progress
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  -- Dependencies (array of milestone IDs that must be completed before this one)
  depends_on UUID[] DEFAULT '{}',
  
  -- Assignment
  responsible TEXT,
  
  -- Ordering
  order_index INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX idx_project_milestones_account ON public.project_milestones(account_id);
CREATE INDEX idx_project_milestones_pillar ON public.project_milestones(pillar);
CREATE INDEX idx_project_milestones_status ON public.project_milestones(status);
CREATE INDEX idx_project_milestones_order ON public.project_milestones(account_id, order_index);

-- Enable RLS
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for milestones
CREATE POLICY "EP Team can view all milestones"
ON public.project_milestones
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ep_consultants ec
    WHERE ec.user_id = auth.uid() AND ec.active = true
  )
);

CREATE POLICY "EP Team can manage milestones"
ON public.project_milestones
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.ep_consultants ec
    WHERE ec.user_id = auth.uid() AND ec.active = true
  )
);

CREATE POLICY "Account members can view their milestones"
ON public.project_milestones
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.user_id = auth.uid() 
    AND am.account_id = project_milestones.account_id
    AND am.is_active = true
  )
);

-- Create updated_at trigger for milestones
CREATE TRIGGER update_project_milestones_updated_at
BEFORE UPDATE ON public.project_milestones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add milestone_id to project_checkpoints for linking
ALTER TABLE public.project_checkpoints 
ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES public.project_milestones(id);