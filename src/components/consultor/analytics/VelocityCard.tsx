import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, Gauge, Clock } from 'lucide-react';
import type { TimelineMetrics } from '@/types/consulting-reports.types';

interface VelocityCardProps {
  timeline: TimelineMetrics | null;
  loading?: boolean;
}

export function VelocityCard({ timeline, loading }: VelocityCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-44" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!timeline) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">Sem dados de velocidade</p>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    switch (timeline.velocityTrend) {
      case 'accelerating':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'decelerating':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (timeline.velocityTrend) {
      case 'accelerating':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'decelerating':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTrendLabel = () => {
    switch (timeline.velocityTrend) {
      case 'accelerating':
        return 'Acelerando';
      case 'decelerating':
        return 'Desacelerando';
      default:
        return 'Estável';
    }
  };

  // Calculate expected completion weeks
  const weeksToCompletion = timeline.estimatedCompletion
    ? Math.ceil((new Date(timeline.estimatedCompletion).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7))
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Velocidade do Projeto
        </CardTitle>
        <CardDescription>
          Taxa de progresso e previsão de conclusão
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main velocity display */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{timeline.velocity}</span>
              <span className="text-sm text-muted-foreground">% por semana</span>
            </div>
            <Badge className={getTrendColor()}>
              {getTrendIcon()}
              <span className="ml-1">{getTrendLabel()}</span>
            </Badge>
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Iniciado há</span>
            </div>
            <p className="text-lg font-semibold">{timeline.projectAge} dias</p>
          </div>
        </div>

        {/* Estimated completion */}
        {timeline.estimatedCompletion && (
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Previsão de conclusão</p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-medium">
                {new Date(timeline.estimatedCompletion).toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              {weeksToCompletion !== null && weeksToCompletion > 0 && (
                <span className="text-sm text-muted-foreground">
                  ~{weeksToCompletion} semanas
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
