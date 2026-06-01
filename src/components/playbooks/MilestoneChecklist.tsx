import { useMilestoneChecklist } from '@/hooks/useMilestoneChecklist';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, ListChecks } from 'lucide-react';

interface MilestoneChecklistProps {
  projectMilestoneId: string;
  playbookMilestoneId: string | null;
  readOnly?: boolean;
}

export function MilestoneChecklist({ projectMilestoneId, playbookMilestoneId, readOnly = false }: MilestoneChecklistProps) {
  const { 
    checklistItems: items, 
    loading, 
    error, 
    toggleItem, 
    getItemStatus, 
    progressPercentage
  } = useMilestoneChecklist(projectMilestoneId, playbookMilestoneId);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 text-muted-foreground">
        <ListChecks className="h-4 w-4" />
        <span className="text-sm">Nenhum item de checklist para este marco.</span>
      </div>
    );
  }

  const handleToggle = async (checklistItemId: string) => {
    if (readOnly) return;
    await toggleItem(checklistItemId);
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Checklist de Execução</span>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={progressPercentage} className="w-24 h-2" />
          <span className="text-sm text-muted-foreground">{progressPercentage}%</span>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        {items.map((item) => {
          const isChecked = getItemStatus(item.id);
          
          return (
            <div 
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                isChecked 
                  ? 'bg-primary/5 border-primary/20' 
                  : 'bg-card border-border hover:border-border/80'
              } ${readOnly ? '' : 'cursor-pointer'}`}
              onClick={() => handleToggle(item.id)}
            >
              <Checkbox 
                checked={isChecked}
                disabled={readOnly}
                className="mt-0.5"
                onCheckedChange={() => handleToggle(item.id)}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
                    {item.title}
                  </span>
                  {item.is_required && (
                    <Badge variant="outline" className="text-xs">
                      Obrigatório
                    </Badge>
                  )}
                </div>
                {item.description && (
                  <p className={`text-xs mt-1 ${isChecked ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                    {item.description}
                  </p>
                )}
              </div>

              {isChecked && (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Completion Status */}
      {progressPercentage === 100 && (
        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md text-primary">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">Checklist concluído!</span>
        </div>
      )}
    </div>
  );
}
