export type ResourcePriority = 1 | 2 | 3;

export interface ConsultantCapacitySetting {
  id: string;
  consultant_id: string;
  weekly_hours: number;
  max_projects: number;
  available_from: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AvailabilityBlockType =
  | 'vacation'
  | 'holiday'
  | 'training'
  | 'sick'
  | 'offsite'
  | 'other';

export interface ConsultantAvailabilityBlock {
  id: string;
  consultant_id: string;
  start_date: string; // yyyy-MM-dd
  end_date: string; // yyyy-MM-dd
  block_type: AvailabilityBlockType;
  hours_per_day: number | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyHoliday {
  id: string;
  account_id: string;
  holiday_date: string; // yyyy-MM-dd
  name: string;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectResourceRequirement {
  id: string;
  account_id: string;
  week_start: string; // yyyy-MM-dd
  estimated_hours: number;
  priority: ResourcePriority;
  confidence: number | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceAllocationSnapshot {
  id: string;
  week_start: string;
  horizon_weeks: number;
  label: string | null;
  snapshot: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface ResourceWeek {
  weekStart: Date;
  label: string;
  iso: string; // yyyy-MM-dd
}

export interface ConsultantResourceRow {
  consultantId: string;
  consultantName: string;
  weeklyCapacityHours: number;
  avgLoggedHoursLast4Weeks: number;
  utilizationPct: number; // 0-100
  status: 'underutilized' | 'optimal' | 'overloaded';
}

export interface ProjectDemandRow {
  accountId: string;
  accountName: string;
  suggestedHours: number;
  manualHours: number | null;
  finalHours: number;
  priority: ResourcePriority;
}
