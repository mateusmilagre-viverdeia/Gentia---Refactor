import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Clock, 
  User, 
  Calendar,
  Target,
  TrendingUp,
} from 'lucide-react';
import { differenceInDays } from "date-fns";
import { cn } from '@/lib/utils';
import type { 
  OnboardingProcessWithDetails,
  OnboardingCheckpointWithResponses,
} from '@/types/onboarding.types';
import { 
  getStatusLabel, 
  getStatusColor,
  getCheckpointStatusIcon,
} from '@/types/onboarding.types';
import { formatBRT } from "@/lib/datetime";

interface EmployeeViewProps {
  process: OnboardingProcessWithDetails;
  checkpoints: OnboardingCheckpointWithResponses[];
}

export function EmployeeView({ process, checkpoints }: EmployeeViewProps) {
  const totalTasks = process.phases.reduce((acc, phase) => acc + phase.tasks.length, 0);
  const completedTasks = process.phases.reduce(
    (acc, phase) => acc + phase.tasks.filter(t => t.status === 'completed').length, 
    0
  );
  const myTasks = process.phases.flatMap(phase => 
    phase.tasks.filter(t => t.responsible_type === 'employee')
  );
  const myPendingTasks = myTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const myCompletedTasks = myTasks.filter(t => t.status === 'completed');

  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const today = new Date();
  const startDate = new Date(process.start_date);
  const endDate = new Date(process.end_date);
  const totalDays = differenceInDays(endDate, startDate);
  const daysElapsed = differenceInDays(today, startDate);
  const daysRemaining = differenceInDays(endDate, today);
  const timeProgressPercent = totalDays > 0 ? Math.min(100, (daysElapsed / totalDays) * 100) : 0;

  const nextCheckpoint = checkpoints.find(c => c.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Olá, {process.employee_name}!</h2>
              <p className="text-muted-foreground">
                {process.status === 'active' 
                  ? `Seu onboarding está em andamento. Faltam ${daysRemaining} dias.`
                  : process.status === 'completed'
                  ? 'Seu onboarding foi concluído com sucesso!'
                  : 'Seu onboarding ainda não foi iniciado.'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Progresso Geral</CardDescription>
            <CardTitle className="text-3xl">{Math.round(progressPercent)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {completedTasks} de {totalTasks} tarefas concluídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Minhas Tarefas</CardDescription>
            <CardTitle className="text-3xl">{myCompletedTasks.length}/{myTasks.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={myTasks.length > 0 ? (myCompletedTasks.length / myTasks.length) * 100 : 0} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {myPendingTasks.length} pendente{myPendingTasks.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tempo Restante</CardDescription>
            <CardTitle className="text-3xl">{Math.max(0, daysRemaining)} dias</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={timeProgressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Término em {formatBRT(endDate, "d 'de' MMMM")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Next Checkpoint */}
      {nextCheckpoint && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Próximo Checkpoint</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dia {nextCheckpoint.checkpoint_day} — {nextCheckpoint.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatBRT(new Date(nextCheckpoint.scheduled_date), "d 'de' MMMM")}
                </p>
              </div>
              <Badge variant="outline">
                {getCheckpointStatusIcon(nextCheckpoint.status)} Pendente
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Pending Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle className="text-lg">Minhas Próximas Tarefas</CardTitle>
          </div>
          <CardDescription>
            Tarefas que você precisa completar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myPendingTasks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>Todas as suas tarefas foram concluídas!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myPendingTasks.slice(0, 5).map((task) => {
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
                    <Badge variant={task.status === 'in_progress' ? 'default' : 'secondary'}>
                      {task.status === 'in_progress' ? 'Em andamento' : 'Pendente'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Journey Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle className="text-lg">Sua Jornada</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {process.phases.map((phase, index) => {
              const phaseTasks = phase.tasks.length;
              const phaseCompleted = phase.tasks.filter(t => t.status === 'completed').length;
              const isComplete = phase.status === 'completed';
              const isActive = phase.status === 'in_progress';

              return (
                <div key={phase.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                      isComplete && 'bg-green-500 text-white',
                      isActive && 'bg-primary text-primary-foreground',
                      !isComplete && !isActive && 'bg-muted border-2 border-border',
                    )}>
                      {isComplete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </div>
                    {index < process.phases.length - 1 && (
                      <div className={cn(
                        'w-0.5 h-8 mt-1',
                        isComplete ? 'bg-green-500' : 'bg-border'
                      )} />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <p className={cn(
                        'font-medium',
                        isComplete && 'text-green-600',
                        isActive && 'text-primary'
                      )}>
                        {phase.name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {phaseCompleted}/{phaseTasks}
                      </span>
                    </div>
                    <Progress 
                      value={phaseTasks > 0 ? (phaseCompleted / phaseTasks) * 100 : 0} 
                      className="h-1.5 mt-2" 
                    />
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
