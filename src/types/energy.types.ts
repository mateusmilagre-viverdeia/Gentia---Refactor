export interface EnergyCatalogItem {
  id: string;
  label: string;
  category: string;
  category_label: string;
  category_icon?: string;
  active: boolean;
}

export interface EnergySession {
  id: string;
  user_id: string;
  stage: number;
  created_at: string;
  updated_at: string;
}

export interface SelectedEnergyItem {
  id: string;
  label: string;
  category: string;
  category_label: string;
}

export const ENERGY_CATEGORIES = [
  { id: 'reconhecimento', label: 'Rituais de Reconhecimento e Valorização Humana', icon: '🔥', color: 'hsl(var(--chart-1))' },
  { id: 'cultura', label: 'Rituais de Cultura Positiva e Pertencimento', icon: '🧠', color: 'hsl(var(--chart-2))' },
  { id: 'performance', label: 'Rituais de Performance Saudável e Alta Energia', icon: '🚀', color: 'hsl(var(--chart-3))' },
  { id: 'trabalho', label: 'Rituais de Trabalho Inteligente e Produtividade', icon: '🧩', color: 'hsl(var(--chart-4))' },
  { id: 'impacto', label: 'Rituais de Impacto, Propósito e Bem-Estar', icon: '🌱', color: 'hsl(var(--chart-5))' },
];
