// Time Tracking Types

export type TimeEntryCategory = 
  | 'checkpoint'      // Reunião de checkpoint
  | 'preparation'     // Preparação/planejamento
  | 'follow_up'       // Acompanhamento
  | 'documentation'   // Documentação
  | 'training'        // Treinamento
  | 'other';          // Outros

export interface TimeEntry {
  id: string;
  consultant_id: string;
  account_id: string;
  entry_date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  category: TimeEntryCategory;
  description: string | null;
  checkpoint_id: string | null;
  billable: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface TimeEntryWithRelations extends TimeEntry {
  consultant?: {
    id: string;
    name: string;
  };
  account?: {
    id: string;
    name: string;
  };
  checkpoint?: {
    id: string;
    topic: string;
  };
}

export interface CreateTimeEntryInput {
  account_id: string;
  entry_date: string;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes: number;
  category: TimeEntryCategory;
  description?: string | null;
  checkpoint_id?: string | null;
  billable?: boolean;
}

export interface UpdateTimeEntryInput {
  entry_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes?: number;
  category?: TimeEntryCategory;
  description?: string | null;
  checkpoint_id?: string | null;
  billable?: boolean;
}

export interface TimeEntrySummary {
  totalMinutes: number;
  totalHours: number;
  byCategory: Record<TimeEntryCategory, number>;
  byProject: { accountId: string; name: string; minutes: number }[];
  billableMinutes: number;
  nonBillableMinutes: number;
}

export interface ConsultantTimeSummary {
  consultantId: string;
  consultantName: string;
  totalHours: number;
  projectCount: number;
  avgHoursPerProject: number;
  billablePercentage: number;
}

export interface ActiveTimer {
  accountId: string;
  accountName: string;
  category: TimeEntryCategory;
  startedAt: Date;
  elapsedMinutes: number;
}

export interface TimeFilters {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  category?: TimeEntryCategory;
  billable?: boolean;
}

export interface WeeklyTimesheet {
  weekStart: Date;
  weekEnd: Date;
  projects: {
    accountId: string;
    accountName: string;
    dailyMinutes: number[]; // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
    totalMinutes: number;
  }[];
  dailyTotals: number[];
  weekTotal: number;
}

// Constants

export const TIME_CATEGORY_LABELS: Record<TimeEntryCategory, string> = {
  checkpoint: 'Checkpoint',
  preparation: 'Preparação',
  follow_up: 'Acompanhamento',
  documentation: 'Documentação',
  training: 'Treinamento',
  other: 'Outros',
};

export const TIME_CATEGORY_COLORS: Record<TimeEntryCategory, string> = {
  checkpoint: '#3B82F6',   // blue
  preparation: '#8B5CF6',  // purple
  follow_up: '#10B981',    // green
  documentation: '#F59E0B', // amber
  training: '#EC4899',      // pink
  other: '#6B7280',         // gray
};

export const TIME_CATEGORIES: TimeEntryCategory[] = [
  'checkpoint',
  'preparation',
  'follow_up',
  'documentation',
  'training',
  'other',
];

// Helper functions

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function calculateDuration(startTime: string, endTime: string): number {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  return endMinutes - startMinutes;
}
