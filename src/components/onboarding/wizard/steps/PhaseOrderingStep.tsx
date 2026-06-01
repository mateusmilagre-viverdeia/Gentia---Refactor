import { useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical, ArrowUpDown, Star, Check, User, Briefcase, Building2, Monitor, UserCheck, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardPhase, WizardTask } from '@/hooks/useOnboardingWizardState';
import { OnboardingResponsibleType, getResponsibleColor } from '@/types/onboarding.types';

type ExtendedResponsibleType = OnboardingResponsibleType | 'ceo';

interface PhaseOrderingStepProps {
  phase: WizardPhase;
  phaseIndex: number;
  totalPhases: number;
  isLastPhase: boolean;
  onReorder: (tasks: WizardTask[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function PhaseOrderingStep({
  phase,
  phaseIndex,
  totalPhases,
  isLastPhase,
  onReorder,
  onBack,
  onNext,
}: PhaseOrderingStepProps) {
  const selectedTasks = phase.tasks.filter(t => t.selected !== false);
  const [tasks, setTasks] = useState(selectedTasks);

  const handleReorder = (newOrder: WizardTask[]) => {
    const reorderedTasks = newOrder.map((task, index) => ({
      ...task,
      order_index: index,
    }));
    setTasks(reorderedTasks);
    
    // Update all tasks in the phase (keeping unselected ones)
    const unselectedTasks = phase.tasks.filter(t => t.selected === false);
    onReorder([...reorderedTasks, ...unselectedTasks]);
  };

  const getResponsibleIcon = (type: ExtendedResponsibleType) => {
    const icons: Record<ExtendedResponsibleType, React.ReactNode> = {
      rh: <Building2 className="h-3 w-3" />,
      leader: <Briefcase className="h-3 w-3" />,
      employee: <User className="h-3 w-3" />,
      ti: <Monitor className="h-3 w-3" />,
      buddy: <UserCheck className="h-3 w-3" />,
      ceo: <Crown className="h-3 w-3" />,
    };
    return icons[type] || <User className="h-3 w-3" />;
  };

  const getResponsibleLabel = (type: ExtendedResponsibleType) => {
    const labels: Record<ExtendedResponsibleType, string> = {
      rh: 'RH',
      leader: 'Líder',
      employee: 'Colaborador',
      ti: 'TI',
      buddy: 'Buddy',
      ceo: 'CEO',
    };
    return labels[type] || type;
  };

  const getExtendedResponsibleColor = (type: ExtendedResponsibleType): string => {
    if (type === 'ceo') {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    }
    return getResponsibleColor(type as OnboardingResponsibleType);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">Fase {phaseIndex + 1} de {totalPhases}</Badge>
              <Badge variant="secondary">{phase.name}</Badge>
            </div>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              Ordenar Tarefas
            </CardTitle>
            <CardDescription>
              Arraste e solte para definir a ordem de execução
            </CardDescription>
          </div>
          <Badge variant="default" className="text-sm px-3 py-1">
            {tasks.length} tarefas
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <GripVertical className="h-4 w-4" />
          <span>Arraste os itens para reorganizar a ordem das tarefas</span>
        </div>

        {/* Reorderable task list */}
        <Reorder.Group
          axis="y"
          values={tasks}
          onReorder={handleReorder}
          className="space-y-2 max-h-[400px] overflow-y-auto pr-2"
        >
          {tasks.map((task, index) => (
            <Reorder.Item
              key={task.id}
              value={task}
              className="cursor-grab active:cursor-grabbing"
            >
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'p-4 rounded-lg border bg-background transition-shadow',
                  'hover:shadow-md hover:border-primary/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{task.title}</span>
                      {task.is_required && (
                        <Star className="h-3.5 w-3.5 text-destructive fill-destructive flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  
                  <Badge
                    variant="outline"
                    className={cn('gap-1 flex-shrink-0', getExtendedResponsibleColor(task.responsible_type as ExtendedResponsibleType))}
                  >
                    {getResponsibleIcon(task.responsible_type as ExtendedResponsibleType)}
                    {getResponsibleLabel(task.responsible_type as ExtendedResponsibleType)}
                  </Badge>
                </div>
              </motion.div>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <ArrowUpDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma tarefa para ordenar.</p>
            <p className="text-sm">Volte e selecione tarefas primeiro.</p>
          </div>
        )}

        {/* Phase completion indicator */}
        {tasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                Fase "{phase.name}" configurada!
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                {tasks.length} tarefas definidas
              </p>
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
          <Button onClick={onNext}>
            {isLastPhase ? 'Revisar Onboarding' : 'Próxima Fase'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
