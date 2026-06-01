import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { CulturePillar, PILLAR_LABELS, PILLAR_COLORS } from '@/types/pulseCulture.types';
import { cn } from '@/lib/utils';

interface PillarScore {
  pillar: CulturePillar;
  pillar_name: string;
  score: number;
  response_count: number;
}

interface CulturePillarBarsProps {
  data: PillarScore[];
  loading?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 7.5) return 'text-green-600';
  if (score >= 5) return 'text-amber-600';
  return 'text-red-600';
}

function getScoreBgColor(score: number): string {
  if (score >= 7.5) return 'bg-green-500';
  if (score >= 5) return 'bg-amber-500';
  return 'bg-red-500';
}

export function CulturePillarBars({ data, loading }: CulturePillarBarsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ensure all pillars are shown
  const allPillars: CulturePillar[] = ['mission', 'vision', 'value', 'decision', 'indicator', 'project', 'energy', 'development'];
  const pillarData = allPillars.map(pillar => {
    const found = data.find(d => d.pillar === pillar);
    return {
      pillar,
      pillar_name: PILLAR_LABELS[pillar],
      score: found?.score ?? 0,
      response_count: found?.response_count ?? 0,
    };
  }).sort((a, b) => b.score - a.score);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score por Pilar</CardTitle>
        <CardDescription>Detalhamento de cada pilar cultural</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="space-y-4">
            {pillarData.map(item => (
              <div key={item.pillar} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.pillar_name}</span>
                  <span className={cn("text-sm font-bold", getScoreColor(item.score))}>
                    {item.score.toFixed(1)}/10
                  </span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div 
                    className={cn("h-full transition-all", getScoreBgColor(item.score))}
                    style={{ width: `${(item.score / 10) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.response_count} respostas
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível ainda
          </div>
        )}
      </CardContent>
    </Card>
  );
}
