export type EngagementLevel = 'high' | 'medium' | 'low';

export function getEngagementLevel(score: number): EngagementLevel {
  if (score >= 70) return 'high';    // Verde
  if (score >= 40) return 'medium';  // Amarelo
  return 'low';                       // Vermelho
}

export function getEngagementColor(score: number): string {
  const level = getEngagementLevel(score);
  switch (level) {
    case 'high': return 'text-green-600';
    case 'medium': return 'text-yellow-600';
    case 'low': return 'text-red-600';
  }
}

export function getEngagementBgColor(score: number): string {
  const level = getEngagementLevel(score);
  switch (level) {
    case 'high': return 'bg-green-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-red-500';
  }
}

export function getEngagementLabel(score: number): string {
  const level = getEngagementLevel(score);
  switch (level) {
    case 'high': return 'Alto';
    case 'medium': return 'Médio';
    case 'low': return 'Baixo';
  }
}
