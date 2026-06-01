import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PeriodData {
  overallScore: number;
  pillarScores: Record<string, number>;
}

interface CultureTrendComparisonProps {
  current: PeriodData;
  previous: PeriodData;
  loading?: boolean;
}

function getTrendIcon(diff: number) {
  if (diff > 0.3) return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (diff < -0.3) return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function getScoreColor(score: number) {
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-amber-600';
  return 'text-red-600';
}

const PILLAR_LABELS: Record<string, string> = {
  mission: 'Missão',
  vision: 'Visão',
  value: 'Valores',
  decision: 'Decisões',
  indicator: 'Indicadores',
  project: 'Projetos',
  energy: 'Energia',
  development: 'Desenvolvimento',
};

export function CultureTrendComparison({ current, previous, loading }: CultureTrendComparisonProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  const overallDiff = current.overallScore - previous.overallScore;
  const hasData = current.overallScore > 0 || previous.overallScore > 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparativo de Períodos</CardTitle>
          <CardDescription>Período atual vs período anterior</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Dados insuficientes para comparação
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get all pillars from both periods
  const allPillars = [...new Set([
    ...Object.keys(current.pillarScores),
    ...Object.keys(previous.pillarScores),
  ])];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Comparativo de Períodos
          {getTrendIcon(overallDiff)}
        </CardTitle>
        <CardDescription>Período atual vs período anterior</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall score comparison */}
        <div className="flex items-center justify-center gap-6 p-4 rounded-lg bg-muted/50">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Anterior</p>
            <p className={cn("text-3xl font-bold", getScoreColor(previous.overallScore))}>
              {previous.overallScore.toFixed(1)}
            </p>
          </div>
          <ArrowRight className="h-6 w-6 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Atual</p>
            <p className={cn("text-3xl font-bold", getScoreColor(current.overallScore))}>
              {current.overallScore.toFixed(1)}
            </p>
          </div>
          <Badge 
            variant={overallDiff >= 0 ? "default" : "destructive"}
            className="ml-2"
          >
            {overallDiff >= 0 ? '+' : ''}{overallDiff.toFixed(1)}
          </Badge>
        </div>

        {/* Pillar comparison */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Por Pilar</h4>
          <div className="grid gap-2">
            {allPillars.map(pillar => {
              const currentScore = current.pillarScores[pillar] || 0;
              const previousScore = previous.pillarScores[pillar] || 0;
              const diff = currentScore - previousScore;

              return (
                <div 
                  key={pillar}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <span className="font-medium text-sm">
                    {PILLAR_LABELS[pillar] || pillar}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {previousScore.toFixed(1)}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className={cn("font-medium", getScoreColor(currentScore))}>
                      {currentScore.toFixed(1)}
                    </span>
                    <div className="flex items-center gap-1 min-w-[60px] justify-end">
                      {getTrendIcon(diff)}
                      <span className={cn(
                        "text-xs",
                        diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-muted-foreground'
                      )}>
                        {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
