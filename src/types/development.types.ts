export interface DevelopmentCatalogItem {
  id: string;
  label: string;
  category: string;
  category_label: string;
  category_icon?: string;
  active: boolean;
}

export interface DevelopmentSession {
  id: string;
  user_id: string;
  stage: number;
  created_at: string;
  updated_at: string;
}

export interface SelectedDevelopmentItem {
  id: string;
  label: string;
  category: string;
  category_label: string;
}

export const DEVELOPMENT_CATEGORIES = [
  { id: 'crescimento', label: 'Rituais de Crescimento Individual', icon: '🌟', color: 'hsl(var(--chart-1))' },
  { id: 'lideranca', label: 'Rituais de Liderança e Gestão', icon: '👔', color: 'hsl(var(--chart-2))' },
  { id: 'cultura', label: 'Rituais de Cultura e Engajamento', icon: '💜', color: 'hsl(var(--chart-3))' },
  { id: 'execucao', label: 'Rituais de Execução e Performance', icon: '🚀', color: 'hsl(var(--chart-4))' },
  { id: 'integracao', label: 'Rituais de Integração e Experiência', icon: '🤝', color: 'hsl(var(--chart-5))' },
] as const;

export type DevelopmentCategory = typeof DEVELOPMENT_CATEGORIES[number]['id'];
