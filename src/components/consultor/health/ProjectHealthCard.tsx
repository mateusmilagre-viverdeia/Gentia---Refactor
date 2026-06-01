import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, TrendingUp, Calendar, CheckSquare, Zap } from "lucide-react";
import { ProjectHealthScore, HEALTH_WEIGHTS, getHealthStatusLabel, getHealthStatusColor } from "@/types/project-health.types";
import { ProjectHealthBadge } from "./ProjectHealthBadge";
import { cn } from "@/lib/utils";
import { formatBRT } from "@/lib/datetime";


interface ProjectHealthCardProps {
  healthScore: ProjectHealthScore | null;
  loading?: boolean;
  onRefresh?: () => void;
  showDetails?: boolean;
  compact?: boolean;
}

export function ProjectHealthCard({
  healthScore,
  loading = false,
  onRefresh,
  showDetails = true,
  compact = false,
}: ProjectHealthCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className={compact ? "pb-2" : undefined}>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
          {showDetails && (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!healthScore) {
    return (
      <Card>
        <CardHeader className={compact ? "pb-2" : undefined}>
          <CardTitle className="text-lg">Health Score</CardTitle>
          <CardDescription>Nenhum dado disponível</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                O health score ainda não foi calculado para este projeto.
              </p>
              {onRefresh && (
                <Button onClick={onRefresh} variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Calcular Agora
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const components = [
    {
      key: 'progress',
      label: 'Progresso',
      score: healthScore.progress_score,
      weight: HEALTH_WEIGHTS.progress,
      icon: TrendingUp,
      description: 'Conclusão dos pilares de cultura',
    },
    {
      key: 'engagement',
      label: 'Engajamento',
      score: healthScore.engagement_score,
      weight: HEALTH_WEIGHTS.engagement,
      icon: Calendar,
      description: 'Frequência de checkpoints',
    },
    {
      key: 'velocity',
      label: 'Velocidade',
      score: healthScore.velocity_score,
      weight: HEALTH_WEIGHTS.velocity,
      icon: Zap,
      description: 'Progresso vs tempo esperado',
    },
    {
      key: 'actions',
      label: 'Ações',
      score: healthScore.action_score,
      weight: HEALTH_WEIGHTS.actions,
      icon: CheckSquare,
      description: 'Taxa de conclusão de ações',
    },
  ];

  return (
    <Card>
      <CardHeader className={cn("flex flex-row items-center justify-between", compact && "pb-2")}>
        <div>
          <CardTitle className="text-lg flex items-center gap-3">
            Health Score
            <ProjectHealthBadge 
              score={healthScore.health_score} 
              status={healthScore.health_status}
              showLabel
              size="md"
            />
          </CardTitle>
          <CardDescription>
            Última atualização: {formatBRT(new Date(healthScore.calculated_at), "dd/MM/yyyy 'às' HH:mm")}
          </CardDescription>
        </div>
        {onRefresh && (
          <Button onClick={onRefresh} variant="ghost" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        {/* Main Score Gauge */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${healthScore.health_score * 2.51} 251`}
                className={cn(
                  healthScore.health_status === 'healthy' && 'text-green-500',
                  healthScore.health_status === 'at_risk' && 'text-yellow-500',
                  healthScore.health_status === 'critical' && 'text-red-500',
                  healthScore.health_status === 'unknown' && 'text-muted-foreground',
                )}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{healthScore.health_score}</span>
              <span className="text-xs text-muted-foreground">de 100</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {!compact && (
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {healthScore.days_since_last_activity === 0 
                  ? 'Ativo hoje'
                  : `${healthScore.days_since_last_activity} dias sem atividade`
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              <span>
                {healthScore.completed_actions_count} / {healthScore.completed_actions_count + healthScore.pending_actions_count} ações
              </span>
            </div>
          </div>
        )}

        {/* Component Breakdown */}
        {showDetails && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Composição do Score</h4>
            {components.map((component) => (
              <div key={component.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <component.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{component.label}</span>
                    <span className="text-xs text-muted-foreground">
                      ({Math.round(component.weight * 100)}%)
                    </span>
                  </div>
                  <span className="font-medium">{component.score}</span>
                </div>
                <Progress 
                  value={component.score} 
                  className="h-2"
                />
                {!compact && (
                  <p className="text-xs text-muted-foreground">{component.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
