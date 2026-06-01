export interface EPConsultant {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  created_at: string;
  created_by: string;
}

export interface ConsultantAssignment {
  id: string;
  consultant_id: string;
  account_id: string;
  assigned_at: string;
  assigned_by: string;
  active: boolean;
  // Joined data
  consultant?: EPConsultant;
  company?: {
    id: string;
    name: string;
    slug: string | null;
  };
}

export interface ConsultantNote {
  id: string;
  account_id: string;
  author_id: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
  // Joined data
  author?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export interface ProjectCheckpoint {
  id: string;
  account_id: string;
  created_by: string;
  checkpoint_date: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  topic: string;
  summary: string | null;
  notes: string | null; // Private notes (only visible to EP Team)
  created_at: string;
  updated_at: string;
  // Joined data
  actions?: CheckpointAction[];
}

export interface CheckpointAction {
  id: string;
  checkpoint_id: string;
  account_id: string;
  title: string;
  description: string | null;
  responsible: string;
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ClientProjectWithProgress {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
  // Progress data
  mission_stage: number | null;
  vision_stage: number | null;
  values_stage: number | null;
  indicators_stage: number | null;
  decision_stage: number | null;
  energy_stage: number | null;
  development_stage: number | null;
  event_stage: number | null;
  ritual_stage: number | null;
  // Consultants assigned
  consultants?: EPConsultant[];
  // Checkpoints
  pending_actions_count?: number;
  next_checkpoint?: ProjectCheckpoint;
}

export type EPRole = 'super_admin' | 'head_cs' | 'ep_consultant';
