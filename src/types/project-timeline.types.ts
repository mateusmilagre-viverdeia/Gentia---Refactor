// Project Timeline & Milestones Types

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
export type MilestoneType = 'pillar' | 'checkpoint' | 'custom' | 'phase';

export interface ProjectMilestone {
  id: string;
  account_id: string;
  
  // Identification
  pillar: string | null;
  milestone_name: string;
  milestone_type: MilestoneType;
  description: string | null;
  
  // Dates
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  
  // Status and Progress
  status: MilestoneStatus;
  progress_percentage: number;
  
  // Dependencies
  depends_on: string[];
  
  // Assignment
  responsible: string | null;
  
  // Ordering
  order_index: number;
  
  // Playbook Integration (optional - may not be present in all responses)
  playbook_milestone_id?: string | null;
  playbook_application_id?: string | null;
  checklist_progress?: unknown[] | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface MilestoneWithDependencies extends ProjectMilestone {
  dependencies?: ProjectMilestone[];
  dependents?: ProjectMilestone[];
}

// Timeline View Types
export type TimelineViewMode = 'gantt' | 'kanban' | 'list';

export interface TimelineFilter {
  status?: MilestoneStatus[];
  pillar?: string[];
  responsible?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

// Gantt Chart specific types
export interface GanttBar {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  status: MilestoneStatus;
  dependencies: string[];
  color: string;
}

// Kanban specific types
export interface KanbanColumn {
  id: MilestoneStatus;
  title: string;
  items: ProjectMilestone[];
  color: string;
}

// Pillar configuration for timeline
export const PILLAR_CONFIG = {
  mission: { label: 'Missão', color: '#3B82F6', order: 1 },
  vision: { label: 'Visão', color: '#8B5CF6', order: 2 },
  values: { label: 'Valores', color: '#10B981', order: 3 },
  indicators: { label: 'Indicadores', color: '#F59E0B', order: 4 },
  projects: { label: 'Projetos', color: '#EC4899', order: 5 },
  energy: { label: 'Energia', color: '#EF4444', order: 6 },
  development: { label: 'Desenvolvimento', color: '#06B6D4', order: 7 },
  decision: { label: 'Decisão', color: '#6366F1', order: 8 },
} as const;

export type PillarKey = keyof typeof PILLAR_CONFIG;

// Status colors for timeline
export const STATUS_COLORS = {
  pending: { bg: 'bg-muted', border: 'border-border', text: 'text-muted-foreground' },
  in_progress: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  completed: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  blocked: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  cancelled: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500' },
} as const;

// Helper function to get status label
export function getMilestoneStatusLabel(status: MilestoneStatus): string {
  switch (status) {
    case 'pending':
      return 'Pendente';
    case 'in_progress':
      return 'Em Andamento';
    case 'completed':
      return 'Concluído';
    case 'blocked':
      return 'Bloqueado';
    case 'cancelled':
      return 'Cancelado';
  }
}

// Helper to calculate days between dates
export function daysBetween(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Helper to check if milestone is overdue
export function isMilestoneOverdue(milestone: ProjectMilestone): boolean {
  if (milestone.status === 'completed' || milestone.status === 'cancelled') {
    return false;
  }
  if (!milestone.planned_end) {
    return false;
  }
  return new Date(milestone.planned_end) < new Date();
}
