import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Users, User, Briefcase, Building2, Monitor, UserCheck, Star, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardPhase, WizardTask } from '@/hooks/useOnboardingWizardState';
import { OnboardingResponsibleType, getResponsibleColor } from '@/types/onboarding.types';

// Extended responsible types including CEO
type ExtendedResponsibleType = OnboardingResponsibleType | 'ceo';

interface PhaseResponsiblesStepProps {
  phase: WizardPhase;
  phaseIndex: number;
  totalPhases: number;
  onTaskUpdate: (taskId: string, updates: Partial<WizardTask>) => void;
  onBack: () => void;
  onNext: () => void;
}

const RESPONSIBLE_OPTIONS: { value: ExtendedResponsibleType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'rh', label: 'RH', icon: <Building2 className="h-4 w-4" />, description: 'Recursos Humanos' },
  { value: 'leader', label: 'Líder', icon: <Briefcase className="h-4 w-4" />, description: 'Gestor direto' },
  { value: 'employee', label: 'Colaborador', icon: <User className="h-4 w-4" />, description: 'Novo funcionário' },
  { value: 'ti', label: 'TI', icon: <Monitor className="h-4 w-4" />, description: 'Tecnologia' },
  { value: 'buddy', label: 'Buddy', icon: <UserCheck className="h-4 w-4" />, description: 'Mentor' },
  { value: 'ceo', label: 'CEO', icon: <Crown className="h-4 w-4" />, description: 'Direção' },
];

export function PhaseResponsiblesStep({
  phase,
  phaseIndex,
  totalPhases,
  onTaskUpdate,
  onBack,
  onNext,
}: PhaseResponsiblesStepProps) {
  const selectedTasks = phase.tasks.filter(t => t.selected !== false);
  
  // Count tasks by responsible
  const responsibleCounts: Record<ExtendedResponsibleType, number> = {
    rh: 0,
    leader: 0,
    employee: 0,
    ti: 0,
    buddy: 0,
    ceo: 0,
  };
  
  selectedTasks.forEach(task => {
    const type = task.responsible_type as ExtendedResponsibleType;
    if (responsibleCounts[type] !== undefined) {
      responsibleCounts[type]++;
    }
  });

  const configuredCount = selectedTasks.length;

  const getResponsibleIcon = (type: ExtendedResponsibleType) => {
    const option = RESPONSIBLE_OPTIONS.find(o => o.value === type);
    return option?.icon || <User className="h-4 w-4" />;
  };

  const getResponsibleLabel = (type: ExtendedResponsibleType) => {
    const option = RESPONSIBLE_OPTIONS.find(o => o.value === type);
    return option?.label || type;
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
              <Users className="h-5 w-5" />
              Definir Responsáveis
            </CardTitle>
            <CardDescription>
              Atribua um responsável para cada tarefa selecionada
            </CardDescription>
          </div>
          <div className="text-right">
            <Badge variant="default" className="text-sm px-3 py-1">
              {configuredCount} tarefas
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Responsible summary */}
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
          {RESPONSIBLE_OPTIONS.map(({ value, label, icon }) => {
            const count = responsibleCounts[value];
            if (count === 0) return null;
            
            return (
              <Badge
                key={value}
                variant="outline"
                className={cn('gap-1', getExtendedResponsibleColor(value))}
              >
                {icon}
                {label}: {count}
              </Badge>
            );
          })}
        </div>

        {/* Task list */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {selectedTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="p-4 rounded-lg border bg-background"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{task.title}</span>
                    {task.is_required && (
                      <Star className="h-3.5 w-3.5 text-destructive fill-destructive" />
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Select
                    value={task.responsible_type}
                    onValueChange={(value: ExtendedResponsibleType) => 
                      onTaskUpdate(task.id, { responsible_type: value as OnboardingResponsibleType })
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          {getResponsibleIcon(task.responsible_type as ExtendedResponsibleType)}
                          {getResponsibleLabel(task.responsible_type as ExtendedResponsibleType)}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {RESPONSIBLE_OPTIONS.map(({ value, label, icon, description }) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            {icon}
                            <div>
                              <span className="font-medium">{label}</span>
                              <span className="text-xs text-muted-foreground ml-1">
                                ({description})
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={task.is_required}
                      onCheckedChange={(checked) => onTaskUpdate(task.id, { is_required: checked })}
                      id={`required-${task.id}`}
                    />
                    <Label htmlFor={`required-${task.id}`} className="text-xs text-muted-foreground hidden sm:inline">
                      Obrigatória
                    </Label>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {selectedTasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma tarefa selecionada nesta fase.</p>
            <p className="text-sm">Volte e selecione tarefas primeiro.</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
          <Button onClick={onNext}>
            Ordenar Tarefas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
