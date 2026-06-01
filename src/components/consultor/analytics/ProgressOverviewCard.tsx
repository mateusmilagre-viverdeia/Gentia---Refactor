import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, Target, Calendar, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import type { ProjectProgressReport } from '@/types/consulting-reports.types';

interface ProgressOverviewCardProps {
  report: ProjectProgressReport | null;
  loading?: boolean;
}

export function ProgressOverviewCard({ report, loading }: ProgressOverviewCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Sem dados disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  const { overallProgress, timeline, actionsSummary, milestonesSummary } = report;

  const getVelocityIcon = () => {
    switch (timeline.velocityTrend) {
      case 'accelerating':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decelerating':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getVelocityLabel = () => {
    switch (timeline.velocityTrend) {
      case 'accelerating':
        return 'Acelerando';
      case 'decelerating':
        return 'Desacelerando';
      default:
        return 'Estável';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 70) return 'bg-green-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Progresso Geral
        </CardTitle>
        <CardDescription>
          Visão consolidada do andamento do projeto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progresso Total</span>
            <span className="text-2xl font-bold">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Velocity */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getVelocityIcon()}
              <span>Velocidade</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold">{timeline.velocity}%</span>
              <span className="text-xs text-muted-foreground">/semana</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {getVelocityLabel()}
            </Badge>
          </div>

          {/* Project Age */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Idade do Projeto</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold">{timeline.projectAge}</span>
              <span className="text-xs text-muted-foreground">dias</span>
            </div>
            {timeline.estimatedCompletion && (
              <p className="text-xs text-muted-foreground">
                Previsão: {new Date(timeline.estimatedCompletion).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-lg font-semibold">{actionsSummary.completed}</span>
            </div>
            <p className="text-xs text-muted-foreground">Ações Concluídas</p>
          </div>

          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-yellow-600">
              <Clock className="h-4 w-4" />
              <span className="text-lg font-semibold">{actionsSummary.pending + actionsSummary.inProgress}</span>
            </div>
            <p className="text-xs text-muted-foreground">Ações Pendentes</p>
          </div>

          <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-lg font-semibold">{milestonesSummary.overdue}</span>
            </div>
            <p className="text-xs text-muted-foreground">Marcos Atrasados</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
