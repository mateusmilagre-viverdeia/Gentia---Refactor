import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronDown, 
  ChevronRight,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  OnboardingPhaseWithTasks, 
  OnboardingTask,
  getPhaseStatusLabel,
  getResponsibleLabel,
  getResponsibleColor,
  getTaskStatusColor,
} from '@/types/onboarding.types';
import { OnboardingTaskItem } from './OnboardingTaskItem';

interface OnboardingPhaseCardProps {
  phase: OnboardingPhaseWithTasks;
  isFirst: boolean;
  isLast: boolean;
  onTaskComplete: (taskId: string) => void;
  onTaskUncomplete: (taskId: string) => void;
  onTaskSkip: (taskId: string) => void;
  onUpdatePhaseStatus: (phaseId: string, status: 'pending' | 'in_progress' | 'completed') => void;
  isUpdating: boolean;
}

export function OnboardingPhaseCard({
  phase,
  isFirst,
  isLast,
  onTaskComplete,
  onTaskUncomplete,
  onTaskSkip,
  onUpdatePhaseStatus,
  isUpdating,
}: OnboardingPhaseCardProps) {
  const [isOpen, setIsOpen] = useState(phase.status === 'in_progress' || phase.status === 'pending');

  const completedTasks = phase.tasks.filter(t => t.status === 'completed' || t.status === 'skipped');
  const progress = phase.tasks.length > 0 
    ? Math.round((completedTasks.length / phase.tasks.length) * 100) 
    : 0;

  const getStatusIcon = () => {
    switch (phase.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = () => {
    switch (phase.status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="relative">
      {/* Timeline connector */}
      {!isFirst && (
        <div className="absolute left-6 -top-4 w-0.5 h-4 bg-border" />
      )}
      {!isLast && (
        <div className="absolute left-6 -bottom-4 w-0.5 h-4 bg-border" />
      )}

      <Card className={cn(
        'transition-all',
        phase.status === 'in_progress' && 'ring-2 ring-primary/20'
      )}>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                {getStatusIcon()}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{phase.name}</CardTitle>
                    <Badge variant={getStatusBadgeVariant()}>
                      {getPhaseStatusLabel(phase.status)}
                    </Badge>
                  </div>
                  {phase.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {phase.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{completedTasks.length}/{phase.tasks.length}</p>
                    <p className="text-xs text-muted-foreground">tarefas</p>
                  </div>
                  <div className="w-20">
                    <Progress value={progress} className="h-2" />
                  </div>
                  {isOpen ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Phase Actions */}
              {phase.status !== 'completed' && (
                <div className="flex gap-2 mb-4 pb-4 border-b">
                  {phase.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdatePhaseStatus(phase.id, 'in_progress')}
                      disabled={isUpdating}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Iniciar Fase
                    </Button>
                  )}
                  {phase.status === 'in_progress' && progress === 100 && (
                    <Button
                      size="sm"
                      onClick={() => onUpdatePhaseStatus(phase.id, 'completed')}
                      disabled={isUpdating}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Concluir Fase
                    </Button>
                  )}
                </div>
              )}

              {/* Tasks List */}
              {phase.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma tarefa nesta fase.
                </p>
              ) : (
                <div className="space-y-2">
                  {phase.tasks.map((task) => (
                    <OnboardingTaskItem
                      key={task.id}
                      task={task}
                      onComplete={() => onTaskComplete(task.id)}
                      onUncomplete={() => onTaskUncomplete(task.id)}
                      onSkip={() => onTaskSkip(task.id)}
                      isUpdating={isUpdating}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
