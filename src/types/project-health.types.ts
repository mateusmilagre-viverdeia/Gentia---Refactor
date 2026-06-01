// Project Health Score Types

export type HealthStatus = 'healthy' | 'at_risk' | 'critical' | 'unknown';

export interface ProjectHealthScore {
  id: string;
  account_id: string;
  
  // Score Components (0-100 each)
  progress_score: number;
  engagement_score: number;
  velocity_score: number;
  action_score: number;
  
  // Final Weighted Score
  health_score: number;
  health_status: HealthStatus;
  
  // Metadata
  last_checkpoint_date: string | null;
  last_activity_date: string | null;
  days_since_last_activity: number;
  pending_actions_count: number;
  completed_actions_count: number;
  
  // Timestamps
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface HealthScoreBreakdown {
  progress: {
    score: number;
    weight: number;
    details: string;
  };
  engagement: {
    score: number;
    weight: number;
    details: string;
  };
  velocity: {
    score: number;
    weight: number;
    details: string;
  };
  actions: {
    score: number;
    weight: number;
    details: string;
  };
}

export interface ProjectHealthWithCompany extends ProjectHealthScore {
  company?: {
    id: string;
    name: string;
    slug: string | null;
  };
}

// Health Score Calculation Constants
export const HEALTH_WEIGHTS = {
  progress: 0.35,
  engagement: 0.25,
  velocity: 0.25,
  actions: 0.15,
} as const;

export const HEALTH_THRESHOLDS = {
  healthy: 70,
  at_risk: 40,
  critical: 0,
} as const;

// Helper function to determine status from score
export function getHealthStatus(score: number): HealthStatus {
  if (score >= HEALTH_THRESHOLDS.healthy) return 'healthy';
  if (score >= HEALTH_THRESHOLDS.at_risk) return 'at_risk';
  return 'critical';
}

// Helper function to get status color
export function getHealthStatusColor(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'at_risk':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-muted-foreground bg-muted border-border';
  }
}

// Helper function to get status label
export function getHealthStatusLabel(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'Saudável';
    case 'at_risk':
      return 'Atenção';
    case 'critical':
      return 'Crítico';
    default:
      return 'Desconhecido';
  }
}

// Helper function to get status icon name
export function getHealthStatusIcon(status: HealthStatus): 'CheckCircle' | 'AlertTriangle' | 'XCircle' | 'HelpCircle' {
  switch (status) {
    case 'healthy':
      return 'CheckCircle';
    case 'at_risk':
      return 'AlertTriangle';
    case 'critical':
      return 'XCircle';
    default:
      return 'HelpCircle';
  }
}
