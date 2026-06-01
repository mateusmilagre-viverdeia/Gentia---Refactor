import { useMemo } from 'react';
import { ProjectMilestone, isMilestoneOverdue, getMilestoneStatusLabel, PILLAR_CONFIG } from '@/types/project-timeline.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Calendar, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { addDays, differenceInDays } from "date-fns";
import { formatBRT } from "@/lib/datetime";

interface TimelineWidgetsProps {
  milestones: ProjectMilestone[];
  healthScore?: {
    health_score: number;
    health_status: string;
  } | null;
}

export function TimelineWidgets({ milestones, healthScore }: TimelineWidgetsProps) {
  const stats = useMemo(() => {
    const total = milestones.length;
    const completed = milestones.filter(m => m.status === 'completed').length;
    const inProgress = milestones.filter(m => m.status === 'in_progress').length;
    const blocked = milestones.filter(m => m.status === 'blocked').length;
    const overdue = milestones.filter(m => isMilestoneOverdue(m)).length;
    
    const avgProgress = total > 0 
      ? Math.round(milestones.reduce((sum, m) => sum + m.progress_percentage, 0) / total)
      : 0;

    // Upcoming milestones (next 14 days)
    const now = new Date();
    const upcoming = milestones
      .filter(m => {
        if (m.status === 'completed' || m.status === 'cancelled') return false;
        if (!m.planned_end) return false;
        const endDate = new Date(m.planned_end);
        const daysUntil = differenceInDays(endDate, now);
        return daysUntil >= 0 && daysUntil <= 14;
      })
      .sort((a, b) => {
        const dateA = a.planned_end ? new Date(a.planned_end).getTime() : 0;
        const dateB = b.planned_end ? new Date(b.planned_end).getTime() : 0;
        return dateA - dateB;
      })
      .slice(0, 5);

    return { total, completed, inProgress, blocked, overdue, avgProgress, upcoming };
  }, [milestones]);

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'at_risk': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getHealthBg = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 dark:bg-green-950';
      case 'at_risk': return 'bg-yellow-100 dark:bg-yellow-950';
      case 'critical': return 'bg-red-100 dark:bg-red-950';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-4">
      {/* Health Score Widget */}
      {healthScore && (
        <Card className={getHealthBg(healthScore.health_status)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className={`text-3xl font-bold ${getHealthColor(healthScore.health_status)}`}>
                {healthScore.health_score}
              </span>
              <Badge 
                variant="outline" 
                className={`capitalize ${getHealthColor(healthScore.health_status)}`}
              >
                {healthScore.health_status === 'healthy' ? 'Saudável' : 
                 healthScore.health_status === 'at_risk' ? 'Atenção' : 'Crítico'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Progresso Geral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{stats.avgProgress}%</span>
            <span className="text-sm text-muted-foreground">
              {stats.completed}/{stats.total} marcos
            </span>
          </div>
          <Progress value={stats.avgProgress} className="h-2" />
          
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="text-center p-2 rounded-md bg-blue-50 dark:bg-blue-950/50">
              <span className="text-lg font-semibold text-blue-600">{stats.inProgress}</span>
              <p className="text-xs text-muted-foreground">Em Andamento</p>
            </div>
            <div className="text-center p-2 rounded-md bg-green-50 dark:bg-green-950/50">
              <span className="text-lg font-semibold text-green-600">{stats.completed}</span>
              <p className="text-xs text-muted-foreground">Concluídos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Alert */}
      {stats.overdue > 0 && (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              Marcos Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-red-600">{stats.overdue}</span>
            <p className="text-xs text-muted-foreground">
              {stats.overdue === 1 ? 'marco precisa' : 'marcos precisam'} de atenção
            </p>
          </CardContent>
        </Card>
      )}

      {/* Blocked Alert */}
      {stats.blocked > 0 && (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-600">
              <Clock className="h-4 w-4" />
              Marcos Bloqueados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-orange-600">{stats.blocked}</span>
            <p className="text-xs text-muted-foreground">
              {stats.blocked === 1 ? 'marco bloqueado' : 'marcos bloqueados'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Milestones */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Próximos Marcos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum marco nos próximos 14 dias
            </p>
          ) : (
            <div className="space-y-3">
              {stats.upcoming.map(milestone => {
                const daysUntil = milestone.planned_end 
                  ? differenceInDays(new Date(milestone.planned_end), new Date())
                  : 0;
                const pillarConfig = milestone.pillar 
                  ? PILLAR_CONFIG[milestone.pillar as keyof typeof PILLAR_CONFIG] 
                  : null;

                return (
                  <div key={milestone.id} className="flex items-start gap-2">
                    <div 
                      className="w-1 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: pillarConfig?.color || 'hsl(var(--muted))' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {milestone.milestone_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {daysUntil === 0 
                          ? 'Hoje' 
                          : daysUntil === 1 
                            ? 'Amanhã' 
                            : `Em ${daysUntil} dias`}
                        {' • '}
                        {milestone.planned_end && formatBRT(new Date(milestone.planned_end), 'dd MMM')}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {milestone.progress_percentage}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
