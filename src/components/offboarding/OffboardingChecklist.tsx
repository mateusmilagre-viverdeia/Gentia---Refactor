import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle, Clock, XCircle, AlertTriangle } from "lucide-react";
import { isPast, isToday } from "date-fns";
import type { OffboardingTask } from "@/types/offboarding.types";
import { getOffboardingTaskStatusLabel, getTaskStatusColor, getResponsibleTypeLabel } from "@/types/offboarding.types";
import { formatBRT } from "@/lib/datetime";

interface OffboardingChecklistProps {
  tasks: OffboardingTask[];
  isLoading: boolean;
  onCompleteTask: (taskId: string) => void;
  onUncompleteTask: (taskId: string) => void;
  onSkipTask: (taskId: string) => void;
  isUpdating?: boolean;
}

const TaskIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'skipped':
    case 'waived':
      return <XCircle className="h-5 w-5 text-muted-foreground" />;
    case 'in_progress':
      return <Clock className="h-5 w-5 text-amber-500" />;
    default:
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
};

export const OffboardingChecklist = ({
  tasks,
  isLoading,
  onCompleteTask,
  onUncompleteTask,
  onSkipTask,
  isUpdating = false,
}: OffboardingChecklistProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checklist de Desligamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
              <Skeleton className="h-5 w-5 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    // Sort by status: pending first, then in_progress, then completed/skipped
    const statusOrder: Record<string, number> = { pending: 0, in_progress: 1, completed: 2, skipped: 3, waived: 4 };
    return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
  });

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const pendingCount = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Checklist de Desligamento</CardTitle>
            <CardDescription>
              {completedCount} de {tasks.length} tarefas concluídas
            </CardDescription>
          </div>
          {pendingCount > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
              {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma tarefa definida para este offboarding.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task) => {
              const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status === 'pending';
              const isDueToday = task.due_date && isToday(new Date(task.due_date));
              const isCompleted = task.status === 'completed';
              const isSkipped = task.status === 'skipped' || task.status === 'waived';

              return (
                <div 
                  key={task.id}
                  className={`flex items-start gap-4 p-4 border rounded-lg transition-colors ${
                    isCompleted ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900' :
                    isSkipped ? 'bg-muted/50 border-muted' :
                    isOverdue ? 'bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900' :
                    'hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    checked={isCompleted}
                    disabled={isUpdating || isSkipped}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onCompleteTask(task.id);
                      } else {
                        onUncompleteTask(task.id);
                      }
                    }}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted-foreground">
                            Responsável: {getResponsibleTypeLabel(task.responsible_type)}
                          </span>
                          {task.due_date && (
                            <span className={`text-xs flex items-center gap-1 ${
                              isOverdue ? 'text-red-600 font-medium' :
                              isDueToday ? 'text-amber-600 font-medium' :
                              'text-muted-foreground'
                            }`}>
                              {isOverdue && <AlertTriangle className="h-3 w-3" />}
                              {formatBRT(new Date(task.due_date), "dd/MM/yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={getTaskStatusColor(task.status as any)}>
                          {getOffboardingTaskStatusLabel(task.status as any)}
                        </Badge>
                        {!isCompleted && !isSkipped && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground"
                            onClick={() => onSkipTask(task.id)}
                            disabled={isUpdating}
                          >
                            Pular
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
