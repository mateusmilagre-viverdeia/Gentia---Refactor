export interface PerformanceAssessment {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface PerformanceAssessmentPoint {
  id: string;
  assessment_id: string;
  first_name: string;
  last_name: string;
  x_position: number; // 0-100 (Fit Cultural: 0=-, 100=+)
  y_position: number; // 0-100 (Resultado: 0=-, 100=+)
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PerformanceAssessmentVersionHistory {
  id: string;
  assessment_id: string;
  snapshot: {
    points: PerformanceAssessmentPoint[];
  };
  variant: string;
  created_at: string;
}

export type QuadrantType = 'desligar' | 'treinar' | 'decisao' | 'promover';

export interface QuadrantInfo {
  type: QuadrantType;
  label: string;
  color: string;
  bgClass: string;
}

export const QUADRANT_CONFIG: Record<QuadrantType, QuadrantInfo> = {
  desligar: {
    type: 'desligar',
    label: 'Desligar',
    color: 'hsl(220, 60%, 25%)', // dark blue
    bgClass: 'bg-slate-700',
  },
  treinar: {
    type: 'treinar',
    label: 'Desenvolver',
    color: 'hsl(220, 60%, 30%)', // dark blue
    bgClass: 'bg-slate-600',
  },
  decisao: {
    type: 'decisao',
    label: 'Avaliar cada caso (estômago)',
    color: 'hsl(220, 60%, 35%)', // dark blue
    bgClass: 'bg-slate-500',
  },
  promover: {
    type: 'promover',
    label: 'Delegar Desafios',
    color: 'hsl(220, 60%, 40%)', // dark blue
    bgClass: 'bg-slate-400',
  },
};

export function getQuadrantFromPosition(x: number, y: number): QuadrantType {
  if (x < 50 && y < 50) return 'desligar';
  if (x >= 50 && y < 50) return 'treinar';
  if (x < 50 && y >= 50) return 'decisao';
  return 'promover';
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
