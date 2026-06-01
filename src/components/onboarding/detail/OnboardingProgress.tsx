import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Users, ListTodo } from 'lucide-react';
import { OnboardingPhaseWithTasks } from '@/types/onboarding.types';

interface OnboardingProgressProps {
  phases: OnboardingPhaseWithTasks[];
}

export function OnboardingProgress({ phases }: OnboardingProgressProps) {
  const allTasks = phases.flatMap(p => p.tasks);
  const completedTasks = allTasks.filter(t => t.status === 'completed');
  const inProgressTasks = allTasks.filter(t => t.status === 'in_progress');
  const pendingTasks = allTasks.filter(t => t.status === 'pending');
  
  const progress = allTasks.length > 0 
    ? Math.round((completedTasks.length / allTasks.length) * 100) 
    : 0;

  const completedPhases = phases.filter(p => p.status === 'completed').length;
  const currentPhase = phases.find(p => p.status === 'in_progress');

  // Tasks by responsible
  const tasksByResponsible = {
    rh: allTasks.filter(t => t.responsible_type === 'rh'),
    leader: allTasks.filter(t => t.responsible_type === 'leader'),
    employee: allTasks.filter(t => t.responsible_type === 'employee'),
  };

  const completedByResponsible = {
    rh: tasksByResponsible.rh.filter(t => t.status === 'completed').length,
    leader: tasksByResponsible.leader.filter(t => t.status === 'completed').length,
    employee: tasksByResponsible.employee.filter(t => t.status === 'completed').length,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Progress Geral */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Progresso Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{progress}%</div>
          <Progress value={progress} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {completedTasks.length} de {allTasks.length} tarefas
          </p>
        </CardContent>
      </Card>

      {/* Fases */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Fases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {completedPhases}/{phases.length}
          </div>
          {currentPhase && (
            <Badge variant="secondary" className="mt-2">
              Atual: {currentPhase.name}
            </Badge>
          )}
          {!currentPhase && phases.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {completedPhases === phases.length ? 'Todas completas' : 'Aguardando início'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Status das Tarefas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Status das Tarefas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Concluídas</span>
              <span className="font-medium text-green-600">{completedTasks.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Em Andamento</span>
              <span className="font-medium text-yellow-600">{inProgressTasks.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pendentes</span>
              <span className="font-medium text-muted-foreground">{pendingTasks.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Por Responsável */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Por Responsável
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">RH</span>
              <span className="font-medium">{completedByResponsible.rh}/{tasksByResponsible.rh.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Líder</span>
              <span className="font-medium">{completedByResponsible.leader}/{tasksByResponsible.leader.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Colaborador</span>
              <span className="font-medium">{completedByResponsible.employee}/{tasksByResponsible.employee.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
