export interface PeopleAnalysis {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  values_snapshot: { label: string }[];
  created_at: string;
  updated_at: string;
}

export interface PeopleAnalysisMember {
  id: string;
  analysis_id: string;
  name: string;
  position: number;
  created_at: string;
  // Filter-related fields
  user_id: string | null;
  team_id: string | null;
  org_node_id: string | null;
  // Joined data (optional)
  team?: { id: string; name: string } | null;
  org_node?: { id: string; title: string } | null;
  user_profile?: { id: string; full_name: string } | null;
}

export interface PeopleAnalysisRating {
  id: string;
  member_id: string;
  value_label: string;
  score: number; // 0, 0.5, or 1
  created_at: string;
}

export interface PeopleAnalysisVersionHistory {
  id: string;
  analysis_id: string;
  snapshot: unknown;
  created_at: string;
  variant: string;
}

export type TrafficLightColor = 'red' | 'yellow' | 'green';

export function getScoreTrafficLight(score: number): TrafficLightColor {
  if (score === 0) return 'red';
  if (score === 0.5) return 'yellow';
  return 'green';
}

export function getTotalTrafficLight(total: number): TrafficLightColor {
  if (total <= 3) return 'red';
  if (total === 3.5) return 'yellow';
  return 'green';
}

// Filter option types
export interface FilterOption {
  id: string;
  name: string;
  memberCount: number;
}

export interface PeopleAnalysisFiltersState {
  selectedTeamId: string | null;
  selectedFunctionId: string | null;
}

export interface PeopleAnalysisFilterOptions {
  teams: FilterOption[];
  functions: FilterOption[];
}
