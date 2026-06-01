import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  SkipForward, 
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  OnboardingTask,
  getResponsibleLabel,
  getResponsibleColor,
  getTaskStatusLabel,
  getTaskStatusColor,
} from '@/types/onboarding.types';

interface OnboardingTaskItemProps {
  task: OnboardingTask;
  onComplete: () => void;
  onUncomplete: () => void;
  onSkip: () => void;
  isUpdating: boolean;
}

export function OnboardingTaskItem({
  task,
  onComplete,
  onUncomplete,
  onSkip,
  isUpdating,
}: OnboardingTaskItemProps) {
  const isCompleted = task.status === 'completed';
  const isSkipped = task.status === 'skipped';
  const isDone = isCompleted || isSkipped;

  const handleCheckChange = () => {
    if (isCompleted) {
      onUncomplete();
    } else {
      onComplete();
    }
  };

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border transition-colors',
      isDone && 'bg-muted/50',
      !isDone && 'hover:bg-muted/30'
    )}>
      <Checkbox
        checked={isCompleted}
        onCheckedChange={handleCheckChange}
        disabled={isUpdating || isSkipped}
        className="mt-0.5"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className={cn(
              'font-medium',
              isDone && 'line-through text-muted-foreground'
            )}>
              {task.title}
              {task.is_required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </p>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {task.description}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={cn('text-xs', getResponsibleColor(task.responsible_type))}>
              {getResponsibleLabel(task.responsible_type)}
            </Badge>
            
            {isSkipped && (
              <Badge variant="secondary" className="text-xs">
                Pulada
              </Badge>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isUpdating}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isCompleted && (
                  <DropdownMenuItem onClick={onUncomplete}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Desfazer Conclusão
                  </DropdownMenuItem>
                )}
                {!isDone && !task.is_required && (
                  <DropdownMenuItem onClick={onSkip}>
                    <SkipForward className="h-4 w-4 mr-2" />
                    Pular Tarefa
                  </DropdownMenuItem>
                )}
                {isSkipped && (
                  <DropdownMenuItem onClick={onUncomplete}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restaurar Tarefa
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {task.responsible_name && (
          <p className="text-xs text-muted-foreground mt-1">
            Responsável: {task.responsible_name}
          </p>
        )}
      </div>
    </div>
  );
}
