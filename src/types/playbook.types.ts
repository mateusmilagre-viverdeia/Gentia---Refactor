// Project Playbooks Types
// Templates padronizados para diferentes tipos de projetos de consultoria

export type PlaybookCategory = 'implementation' | 'optimization' | 'rescue' | 'custom';
export type MilestoneType = 'pillar' | 'checkpoint' | 'custom' | 'phase';
export type PillarType = 'mission' | 'vision' | 'values' | 'indicators' | 'projects' | 'energy' | 'development' | 'decision';

// =====================================================
// Core Playbook Types
// =====================================================

export interface ProjectPlaybook {
  id: string;
  name: string;
  description: string | null;
  category: PlaybookCategory;
  estimated_duration_weeks: number;
  is_active: boolean;
  is_default: boolean;
  icon: string | null;
  color: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaybookPhase {
  id: string;
  playbook_id: string;
  name: string;
  description: string | null;
  order_index: number;
  duration_weeks: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaybookMilestone {
  id: string;
  phase_id: string;
  milestone_name: string;
  milestone_type: MilestoneType;
  pillar: PillarType | null;
  description: string | null;
  relative_start_days: number;
  duration_days: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface PlaybookChecklistItem {
  id: string;
  milestone_id: string;
  title: string;
  description: string | null;
  is_required: boolean;
  order_index: number;
  created_at: string;
}

export interface PlaybookGuide {
  id: string;
  playbook_id: string;
  phase_id: string | null;
  milestone_id: string | null;
  title: string;
  content: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectPlaybookApplication {
  id: string;
  account_id: string;
  playbook_id: string;
  applied_by: string | null;
  applied_at: string;
  start_date: string;
  notes: string | null;
}

// =====================================================
// Extended Types with Relationships
// =====================================================

export interface PlaybookMilestoneWithChecklist extends PlaybookMilestone {
  checklist_items: PlaybookChecklistItem[];
}

export interface PlaybookPhaseWithMilestones extends PlaybookPhase {
  milestones: PlaybookMilestoneWithChecklist[];
}

export interface PlaybookWithDetails extends ProjectPlaybook {
  phases: PlaybookPhaseWithMilestones[];
  guides: PlaybookGuide[];
}

export interface PlaybookApplicationWithDetails extends ProjectPlaybookApplication {
  playbook: ProjectPlaybook;
}

// =====================================================
// Form & UI Types
// =====================================================

export interface CreatePlaybookInput {
  name: string;
  description?: string;
  category: PlaybookCategory;
  estimated_duration_weeks: number;
  icon?: string;
  color?: string;
}

export interface CreatePhaseInput {
  playbook_id: string;
  name: string;
  description?: string;
  duration_weeks: number;
  color?: string;
  order_index: number;
}

export interface CreateMilestoneInput {
  phase_id: string;
  milestone_name: string;
  milestone_type: MilestoneType;
  pillar?: PillarType;
  description?: string;
  relative_start_days: number;
  duration_days: number;
  order_index: number;
}

export interface CreateChecklistItemInput {
  milestone_id: string;
  title: string;
  description?: string;
  is_required: boolean;
  order_index: number;
}

export interface CreateGuideInput {
  playbook_id: string;
  phase_id?: string;
  milestone_id?: string;
  title: string;
  content: string;
  order_index: number;
}

// =====================================================
// Checklist Progress Types (stored in project_milestones)
// =====================================================

export interface ChecklistProgressItem {
  checklist_item_id: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
}

// =====================================================
// Category Configuration
// =====================================================

export const PLAYBOOK_CATEGORY_CONFIG = {
  implementation: {
    label: 'Implementação',
    description: 'Projetos de implementação completa da metodologia',
    icon: 'rocket',
    color: '#3B82F6',
  },
  optimization: {
    label: 'Otimização',
    description: 'Projetos focados em melhorias e otimizações',
    icon: 'settings',
    color: '#8B5CF6',
  },
  rescue: {
    label: 'Resgate',
    description: 'Projetos em situação crítica que precisam de recuperação',
    icon: 'life-buoy',
    color: '#EF4444',
  },
  custom: {
    label: 'Personalizado',
    description: 'Playbook customizado para necessidades específicas',
    icon: 'puzzle',
    color: '#F59E0B',
  },
} as const;

// =====================================================
// Pillar Configuration for Milestones
// =====================================================

export const PILLAR_CONFIG = {
  mission: { label: 'Missão', color: '#3B82F6', icon: 'target' },
  vision: { label: 'Visão', color: '#8B5CF6', icon: 'eye' },
  values: { label: 'Valores', color: '#10B981', icon: 'heart' },
  indicators: { label: 'Indicadores', color: '#F59E0B', icon: 'bar-chart-2' },
  projects: { label: 'Projetos', color: '#EC4899', icon: 'folder' },
  energy: { label: 'Energia', color: '#EF4444', icon: 'zap' },
  development: { label: 'Desenvolvimento', color: '#06B6D4', icon: 'trending-up' },
  decision: { label: 'Decisão', color: '#6366F1', icon: 'git-branch' },
} as const;

// =====================================================
// Helper Functions
// =====================================================

export function getCategoryLabel(category: PlaybookCategory): string {
  return PLAYBOOK_CATEGORY_CONFIG[category]?.label ?? category;
}

export function getCategoryColor(category: PlaybookCategory): string {
  return PLAYBOOK_CATEGORY_CONFIG[category]?.color ?? '#6B7280';
}

export function getPillarLabel(pillar: PillarType): string {
  return PILLAR_CONFIG[pillar]?.label ?? pillar;
}

export function getPillarColor(pillar: PillarType): string {
  return PILLAR_CONFIG[pillar]?.color ?? '#6B7280';
}

export function calculateChecklistProgress(progress: ChecklistProgressItem[]): number {
  if (!progress || progress.length === 0) return 0;
  const completed = progress.filter(item => item.completed).length;
  return Math.round((completed / progress.length) * 100);
}

export function formatDuration(weeks: number): string {
  if (weeks === 1) return '1 semana';
  return `${weeks} semanas`;
}
