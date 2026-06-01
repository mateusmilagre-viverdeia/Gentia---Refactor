import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Briefcase,
  MessageSquare,
  Calendar,
  User,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { 
  OnboardingProcessWithDetails,
  OnboardingCheckpointWithResponses,
  OnboardingAlert,
} from '@/types/onboarding.types';
import { 
  getTaskStatusColor,
  getTaskStatusLabel,
  getResponsibleLabel,
} from '@/types/onboarding.types';
import { CheckpointCard } from '@/components/onboarding/detail/CheckpointCard';
import { formatBRT } from "@/lib/datetime";

interface LeaderViewProps {
  process: OnboardingProcessWithDetails;
  checkpoints: OnboardingCheckpointWithResponses[];
  alerts: OnboardingAlert[];
  onCheckpointRefresh: () => void;
}

export function LeaderView({ 
  process, 
  checkpoints, 
  alerts,
  onCheckpointRefresh,
}: LeaderViewProps) {
  const totalTasks = process.phases.reduce((acc, phase) => acc + phase.tasks.length, 0);
  const completedTasks = process.phases.reduce(
    (acc, phase) => acc + phase.tasks.filter(t => t.status === 'completed').length, 
    0
  );
  const leaderTasks = process.phases.flatMap(phase => 
    phase.tasks.filter(t => t.responsible_type === 'leader')
  );
  const leaderPendingTasks = leaderTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const activeAlerts = alerts.filter(a => !a.resolved_at);
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'high' || a.severity === 'critical');

  const pendingCheckpoints = checkpoints.filter(c => {
    const hasLeaderResponse = c.responses?.some(r => r.respondent_type === 'leader');
    return !hasLeaderResponse && (c.status === 'pending' || c.status === 'attention' || c.status === 'at_risk');
  });

  return (
    <div className="space-y-6">
      {/* Leader Summary Card */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 border-blue-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Briefcase className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Onboarding de {process.employee_name}</h2>
              <p className="text-muted-foreground">
                {process.employee_role && `${process.employee_role} • `}
                Progresso: {Math.round(progressPercent)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
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
            <CardDescription>Suas Tarefas Pendentes</CardDescription>
            <CardTitle className="text-2xl">{leaderPendingTasks.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              de {leaderTasks.length} tarefas atribuídas
            </p>
          </CardContent>
        </Card>

        <Card className={criticalAlerts.length > 0 ? 'border-red-200 bg-red-50/50' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>Alertas Ativos</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {activeAlerts.length}
              {criticalAlerts.length > 0 && (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {criticalAlerts.length} crítico{criticalAlerts.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Checkpoints Pendentes</CardDescription>
            <CardTitle className="text-2xl">{pendingCheckpoints.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              aguardando sua avaliação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Leader Actions */}
      {(leaderPendingTasks.length > 0 || pendingCheckpoints.length > 0) && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Ações Pendentes</CardTitle>
            </div>
            <CardDescription>
              Tarefas e avaliações que precisam da sua atenção
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Leader Tasks */}
            {leaderPendingTasks.slice(0, 5).map((task) => {
              const phase = process.phases.find(p => p.id === task.phase_id);
              return (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className={cn(
                    'w-2 h-2 rounded-full mt-2',
                    task.status === 'in_progress' ? 'bg-yellow-500' : 'bg-gray-400'
                  )} />
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">{phase?.name}</p>
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        Prazo: {formatBRT(new Date(task.due_date), "d/MM/yyyy")}
                      </p>
                    )}
                  </div>
                  <Badge className={getTaskStatusColor(task.status)}>
                    {getTaskStatusLabel(task.status)}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Pending Checkpoints for Leader Response */}
      {pendingCheckpoints.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <CardTitle className="text-lg">Checkpoints para Avaliar</CardTitle>
            </div>
            <CardDescription>
              Responda aos checkpoints para acompanhar a evolução do colaborador
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingCheckpoints.map((checkpoint) => (
              <CheckpointCard
                key={checkpoint.id}
                checkpoint={checkpoint}
                processId={process.id}
                onResponseSubmit={onCheckpointRefresh}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Tasks by Phase */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Visão por Fase</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {process.phases.map((phase) => {
              const phaseTasks = phase.tasks.length;
              const phaseCompleted = phase.tasks.filter(t => t.status === 'completed').length;
              
              return (
                <div key={phase.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {phase.status === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : phase.status === 'in_progress' ? (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted" />
                      )}
                      <span className="font-medium">{phase.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {phaseCompleted}/{phaseTasks}
                    </span>
                  </div>
                  <Progress value={phaseTasks > 0 ? (phaseCompleted / phaseTasks) * 100 : 0} className="h-2" />
                  
                  {/* Show tasks with their responsible */}
                  <div className="pl-6 space-y-1">
                    {phase.tasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between text-sm py-1">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            task.status === 'completed' && 'bg-green-500',
                            task.status === 'in_progress' && 'bg-yellow-500',
                            task.status === 'pending' && 'bg-gray-400',
                            task.status === 'skipped' && 'bg-gray-300',
                          )} />
                          <span className={task.status === 'completed' ? 'text-muted-foreground line-through' : ''}>
                            {task.title}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getResponsibleLabel(task.responsible_type)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
