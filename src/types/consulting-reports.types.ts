// Consulting Reports Types

import { ProjectHealthScore, HealthStatus } from './project-health.types';
import { ProjectCheckpoint, CheckpointAction } from './consultant.types';
import { ProjectMilestone } from './project-timeline.types';

// Pillar progress information
export interface PillarProgress {
  pillar: string;
  label: string;
  currentStage: number;
  maxStage: number;
  percentage: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

// Milestones summary
export interface MilestonesSummary {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  blocked: number;
  overdue: number;
  avgProgress: number;
}

// Checkpoints summary
export interface CheckpointsSummary {
  total: number;
  completed: number;
  scheduled: number;
  cancelled: number;
  upcoming: ProjectCheckpoint[];
  lastCheckpoint: ProjectCheckpoint | null;
}

// Actions summary
export interface ActionsSummary {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
}

// Timeline metrics
export interface TimelineMetrics {
  projectStartDate: string;
  projectAge: number; // days
  estimatedCompletion: string | null;
  velocity: number; // percentage points per week
  velocityTrend: 'accelerating' | 'stable' | 'decelerating';
}

// Full project progress report
export interface ProjectProgressReport {
  projectId: string;
  projectName: string;
  projectSlug: string | null;
  consultants: string[];
  healthScore: ProjectHealthScore | null;
  pillarProgress: PillarProgress[];
  overallProgress: number;
  milestonesSummary: MilestonesSummary;
  checkpointsSummary: CheckpointsSummary;
  actionsSummary: ActionsSummary;
  timeline: TimelineMetrics;
  generatedAt: string;
}

// Portfolio summary for dashboard
export interface PortfolioSummary {
  totalProjects: number;
  avgHealthScore: number;
  avgProgress: number;
  projectsByStatus: {
    healthy: number;
    at_risk: number;
    critical: number;
    unknown: number;
  };
  totalActions: number;
  pendingActions: number;
  overdueActions: number;
  activeConsultants: number;
}

// Consultant performance metrics
export interface ConsultantPerformance {
  consultantId: string;
  consultantName: string;
  projectCount: number;
  avgHealthScore: number;
  avgProgress: number;
  pendingActions: number;
  overdueActions: number;
  completionRate: number;
}

// Trend data point
export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

// Project at risk details
export interface AtRiskProject {
  projectId: string;
  projectName: string;
  healthScore: number;
  healthStatus: HealthStatus;
  daysSinceLastActivity: number;
  pendingActions: number;
  overdueActions: number;
  consultants: string[];
  riskFactors: string[];
}

// Full portfolio report
export interface PortfolioReport {
  period: string;
  generatedAt: string;
  summary: PortfolioSummary;
  projects: ProjectProgressReport[];
  consultantPerformance: ConsultantPerformance[];
  atRiskProjects: AtRiskProject[];
  trends: {
    healthScore: TrendDataPoint[];
    progress: TrendDataPoint[];
    completedActions: TrendDataPoint[];
  };
}

// Report export configuration
export interface ReportExportConfig {
  type: 'project' | 'portfolio';
  format: 'pdf' | 'csv';
  sections: string[];
  period?: '7d' | '30d' | '90d' | 'all';
  includeCharts?: boolean;
}

// Pillar configuration for calculations
export const PILLAR_CONFIG = {
  mission: { label: 'Missão', maxStage: 16, order: 1 },
  vision: { label: 'Visão', maxStage: 13, order: 2 },
  values: { label: 'Valores', maxStage: 9, order: 3 },
  indicators: { label: 'Indicadores', maxStage: 3, order: 4 },
  decision: { label: 'Decisão', maxStage: 9, order: 5 },
  energy: { label: 'Energia', maxStage: 5, order: 6 },
  development: { label: 'Desenvolvimento', maxStage: 5, order: 7 },
  event: { label: 'Evento', maxStage: 11, order: 8 },
  ritual: { label: 'Rituais', maxStage: 7, order: 9 },
} as const;

export type PillarKey = keyof typeof PILLAR_CONFIG;

// Helper to calculate pillar percentage
export function calculatePillarPercentage(stage: number | null, pillar: PillarKey): number {
  if (!stage || stage === 0) return 0;
  const maxStage = PILLAR_CONFIG[pillar]?.maxStage || 9;
  return Math.min(100, Math.round((stage / maxStage) * 100));
}

// Helper to get pillar status
export function getPillarStatus(percentage: number): 'not_started' | 'in_progress' | 'completed' {
  if (percentage === 0) return 'not_started';
  if (percentage >= 100) return 'completed';
  return 'in_progress';
}
