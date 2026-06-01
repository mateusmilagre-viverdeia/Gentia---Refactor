import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Building2,
  FileText,
  Calendar,
  Users,
  TrendingUp,
  Download,
  History,
} from 'lucide-react';
import { differenceInDays } from "date-fns";
import { cn } from '@/lib/utils';
import type { 
  OnboardingProcessWithDetails,
  OnboardingCheckpointWithResponses,
  OnboardingAlert,
  OnboardingSuccessMetric,
} from '@/types/onboarding.types';
import { 
  getStatusLabel, 
  getStatusColor,
  getTaskStatusLabel,
  getResponsibleLabel,
  getResponsibleColor,
  getRecommendationLabel,
} from '@/types/onboarding.types';
import { AlertsPanel } from '@/components/onboarding/detail/AlertsPanel';
import { EvaluationSummaryCard } from '@/components/onboarding/detail/EvaluationSummaryCard';
import { formatBRT } from "@/lib/datetime";

interface HRViewProps {
  process: OnboardingProcessWithDetails;
  checkpoints: OnboardingCheckpointWithResponses[];
  alerts: OnboardingAlert[];
  metrics: OnboardingSuccessMetric[];
}

export function HRView({ process, checkpoints, alerts, metrics }: HRViewProps) {
  const totalTasks = process.phases.reduce((acc, phase) => acc + phase.tasks.length, 0);
  const completedTasks = process.phases.reduce(
    (acc, phase) => acc + phase.tasks.filter(t => t.status === 'completed').length, 
    0
  );
  const skippedTasks = process.phases.reduce(
    (acc, phase) => acc + phase.tasks.filter(t => t.status === 'skipped').length, 
    0
  );
  
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const today = new Date();
  const startDate = new Date(process.start_date);
  const endDate = new Date(process.end_date);
  const totalDays = differenceInDays(endDate, startDate);
  const daysElapsed = differenceInDays(today, startDate);

  const tasksByResponsible = process.phases.reduce((acc, phase) => {
    phase.tasks.forEach(task => {
      if (!acc[task.responsible_type]) {
        acc[task.responsible_type] = { total: 0, completed: 0 };
      }
      acc[task.responsible_type].total++;
      if (task.status === 'completed') {
        acc[task.responsible_type].completed++;
      }
    });
    return acc;
  }, {} as Record<string, { total: number; completed: number }>);

  const activeAlerts = alerts.filter(a => !a.resolved_at);
  const completedCheckpoints = checkpoints.filter(c => c.status === 'completed');

  const metricsAchieved = metrics.filter(m => m.is_achieved === true).length;
  const metricsEvaluated = metrics.filter(m => m.evaluated_at !== null).length;

  return (
    <div className="space-y-6">
      {/* HR Dashboard Header */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-purple-500/5 border-purple-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{process.employee_name}</h2>
                <div className="flex items-center gap-2 text-muted-foreground">
                  {process.employee_role && <span>{process.employee_role}</span>}
                  {process.employee_department && (
                    <>
                      <span>•</span>
                      <span>{process.employee_department}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn('text-sm', getStatusColor(process.status))}>
                {getStatusLabel(process.status)}
              </Badge>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Progresso</CardDescription>
            <CardTitle className="text-2xl">{Math.round(progressPercent)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercent} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tarefas</CardDescription>
            <CardTitle className="text-2xl">{completedTasks}/{totalTasks}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {skippedTasks > 0 && `${skippedTasks} pulada${skippedTasks > 1 ? 's' : ''}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Checkpoints</CardDescription>
            <CardTitle className="text-2xl">{completedCheckpoints.length}/{checkpoints.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">concluídos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Métricas</CardDescription>
            <CardTitle className="text-2xl">{metricsAchieved}/{metricsEvaluated}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">atingidas</p>
          </CardContent>
        </Card>

        <Card className={activeAlerts.length > 0 ? 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>Alertas</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {activeAlerts.length}
              {activeAlerts.length > 0 && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">ativos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Process Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle className="text-lg">Detalhes do Processo</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Data de Início</p>
                  <p className="font-medium">{formatBRT(startDate, "d 'de' MMMM 'de' yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data de Término</p>
                  <p className="font-medium">{formatBRT(endDate, "d 'de' MMMM 'de' yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duração Total</p>
                  <p className="font-medium">{totalDays} dias</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dias Decorridos</p>
                  <p className="font-medium">{Math.max(0, daysElapsed)} dias</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Líder</p>
                  <p className="font-medium">{process.leader_name || 'Não definido'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">RH Responsável</p>
                  <p className="font-medium">{process.hr_responsible_name || 'Não definido'}</p>
                </div>
              </div>

              <Separator />

              {/* Tasks by Responsible */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Tarefas por Responsável
                </h4>
                <div className="space-y-2">
                  {Object.entries(tasksByResponsible).map(([type, data]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getResponsibleColor(type as any)} variant="outline">
                          {getResponsibleLabel(type as any)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={data.total > 0 ? (data.completed / data.total) * 100 : 0} 
                          className="w-20 h-2" 
                        />
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {data.completed}/{data.total}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerts Panel */}
          <AlertsPanel processId={process.id} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Evaluation Summary */}
          {process.evaluation && (
            <EvaluationSummaryCard evaluation={process.evaluation} />
          )}

          {/* Audit Trail */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                <CardTitle className="text-lg">Histórico de Auditoria</CardTitle>
              </div>
              <CardDescription>Eventos registrados do processo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                  <div>
                    <p className="font-medium">Processo criado</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBRT(new Date(process.created_at), "d/MM/yyyy 'às' HH:mm")}
                    </p>
                  </div>
                </div>
                
                {process.status !== 'draft' && (
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                    <div>
                      <p className="font-medium">Onboarding iniciado</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBRT(startDate, "d/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                )}

                {checkpoints.filter(c => c.completed_at).map(checkpoint => (
                  <div key={checkpoint.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                    <div>
                      <p className="font-medium">Checkpoint Dia {checkpoint.checkpoint_day} concluído</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBRT(new Date(checkpoint.completed_at!), "d/MM/yyyy 'às' HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}

                {process.evaluation && (
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
                    <div>
                      <p className="font-medium">Avaliação final registrada</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBRT(new Date(process.evaluation.evaluated_at), "d/MM/yyyy 'às' HH:mm")}
                        {' • '}
                        {getRecommendationLabel(process.evaluation.recommendation)}
                      </p>
                    </div>
                  </div>
                )}

                {process.status === 'completed' && (
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                    <div>
                      <p className="font-medium">Onboarding concluído</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBRT(new Date(process.updated_at), "d/MM/yyyy 'às' HH:mm")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Success Metrics */}
          {metrics.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  <CardTitle className="text-lg">Métricas de Sucesso</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.map(metric => (
                    <div key={metric.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{metric.metric_name}</p>
                        {metric.metric_description && (
                          <p className="text-xs text-muted-foreground">{metric.metric_description}</p>
                        )}
                      </div>
                      {metric.evaluated_at ? (
                        <Badge variant={metric.is_achieved ? 'default' : 'destructive'}>
                          {metric.is_achieved ? 'Atingida' : 'Não atingida'}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pendente</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
