export type CulturePillar = 
  | 'mission' 
  | 'vision' 
  | 'value' 
  | 'decision' 
  | 'indicator' 
  | 'project' 
  | 'energy' 
  | 'development';

export interface PulseCultureQuestion {
  id: string;
  account_id: string;
  pillar_type: CulturePillar;
  reference_id?: string | null;
  reference_text: string;
  question_text: string;
  is_active: boolean;
  last_used_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface PulseCultureMetric {
  id: string;
  account_id: string;
  date: string;
  overall_score: number;
  by_pillar: Record<CulturePillar, number>;
  by_value: Record<string, number>;
  response_count: number;
  respondent_count: number;
}

export interface CultureDashboardSummary {
  overallScore: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  participationRate: number;
  topValues: Array<{ name: string; score: number }>;
  lowValues: Array<{ name: string; score: number }>;
}

export const PILLAR_LABELS: Record<CulturePillar, string> = {
  mission: 'Missão',
  vision: 'Visão',
  value: 'Valores',
  decision: 'Decisão',
  indicator: 'Indicadores',
  project: 'Projetos',
  energy: 'Energia',
  development: 'Desenvolvimento',
};

export const PILLAR_COLORS: Record<CulturePillar, string> = {
  mission: 'hsl(var(--chart-1))',
  vision: 'hsl(var(--chart-2))',
  value: 'hsl(var(--chart-3))',
  decision: 'hsl(var(--chart-4))',
  indicator: 'hsl(var(--chart-5))',
  project: 'hsl(var(--primary))',
  energy: 'hsl(var(--accent))',
  development: 'hsl(var(--secondary))',
};
