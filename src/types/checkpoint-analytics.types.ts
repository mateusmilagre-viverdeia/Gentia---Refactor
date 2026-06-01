import type { ProjectCheckpoint, CheckpointAction } from './consultant.types';

export interface CheckpointByPeriod {
  period: string;
  label: string;
  completed: number;
  scheduled: number;
  cancelled: number;
}

export interface CheckpointByClient {
  clientId: string;
  clientName: string;
  completedCount: number;
  scheduledCount: number;
  totalCount: number;
  lastCheckpointDate: string | null;
  pendingActionsCount: number;
}

export interface CheckpointByConsultant {
  consultantId: string;
  consultantName: string;
  completedCount: number;
  scheduledCount: number;
  totalCount: number;
  upcomingCount: number;
}

export interface UpcomingCheckpoint {
  id: string;
  checkpointDate: string;
  topic: string;
  status: string;
  clientId: string;
  clientName: string;
  consultantNames: string[];
}

export interface ClientWithoutCheckpoint {
  id: string;
  name: string;
  lastCheckpointDate: string | null;
  daysSinceLastCheckpoint: number | null;
  hasConsultant: boolean;
}

export interface OverdueAction {
  id: string;
  title: string;
  dueDate: string;
  daysOverdue: number;
  clientId: string;
  clientName: string;
  responsible: string;
  checkpointTopic: string;
}

export interface CheckpointAlert {
  type: 'inactive_client' | 'empty_agenda' | 'overdue_action' | 'overloaded_consultant' | 'no_checkpoints';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  count?: number;
  relatedIds?: string[];
}

export interface CheckpointHistoricalMetrics {
  totalCompleted: number;
  totalScheduled: number;
  totalCancelled: number;
  completionRate: number;
  byMonth: CheckpointByPeriod[];
  byClient: CheckpointByClient[];
  byConsultant: CheckpointByConsultant[];
  avgDaysBetweenCheckpoints: number;
}

export interface CheckpointActionsMetrics {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
  overdueActions: OverdueAction[];
  upcomingDeadlines: OverdueAction[];
}

export interface CheckpointUpcomingMetrics {
  next7Days: number;
  next14Days: number;
  next30Days: number;
  byWeek: { weekStart: string; weekLabel: string; count: number }[];
  byConsultant: CheckpointByConsultant[];
  clientsWithoutFutureCheckpoint: ClientWithoutCheckpoint[];
  upcomingCheckpoints: UpcomingCheckpoint[];
}

export interface CheckpointAlerts {
  clientsInactive: ClientWithoutCheckpoint[];
  consultantsWithEmptyAgenda: { id: string; name: string }[];
  overdueActions: OverdueAction[];
  alerts: CheckpointAlert[];
}

export interface CheckpointAnalytics {
  historical: CheckpointHistoricalMetrics;
  actions: CheckpointActionsMetrics;
  upcoming: CheckpointUpcomingMetrics;
  alerts: CheckpointAlerts;
  isLoading: boolean;
  error: string | null;
}

export interface CheckpointAnalyticsFilters {
  period: '30' | '60' | '90' | '180' | '365' | 'all';
  consultantId?: string;
  clientId?: string;
}
