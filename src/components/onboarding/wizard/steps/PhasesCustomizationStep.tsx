import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  GripVertical,
  ListTodo
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  OnboardingResponsibleType, 
  getResponsibleLabel, 
  getResponsibleColor 
} from '@/types/onboarding.types';

export interface WizardPhase {
  id: string;
  name: string;
  description: string;
  duration_days: number;
  order_index: number;
  tasks: WizardTask[];
}

export interface WizardTask {
  id: string;
  title: string;
  description: string;
  responsible_type: OnboardingResponsibleType;
  is_required: boolean;
  order_index: number;
}

interface PhasesCustomizationStepProps {
  phases: WizardPhase[];
  onPhasesChange: (phases: WizardPhase[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function PhasesCustomizationStep({
  phases,
  onPhasesChange,
  onBack,
  onNext,
}: PhasesCustomizationStepProps) {
  const [openPhases, setOpenPhases] = useState<string[]>(phases.map(p => p.id));

  const togglePhase = (phaseId: string) => {
    setOpenPhases(prev => 
      prev.includes(phaseId) 
        ? prev.filter(id => id !== phaseId)
        : [...prev, phaseId]
    );
  };

  const addPhase = () => {
    const newPhase: WizardPhase = {
      id: `phase-${Date.now()}`,
      name: `Nova Fase`,
      description: '',
      duration_days: 7,
      order_index: phases.length,
      tasks: [],
    };
    onPhasesChange([...phases, newPhase]);
    setOpenPhases(prev => [...prev, newPhase.id]);
  };

  const updatePhase = (phaseId: string, updates: Partial<WizardPhase>) => {
    onPhasesChange(
      phases.map(p => p.id === phaseId ? { ...p, ...updates } : p)
    );
  };

  const deletePhase = (phaseId: string) => {
    onPhasesChange(phases.filter(p => p.id !== phaseId));
  };

  const addTask = (phaseId: string) => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return;

    const newTask: WizardTask = {
      id: `task-${Date.now()}`,
      title: 'Nova Tarefa',
      description: '',
      responsible_type: 'rh',
      is_required: true,
      order_index: phase.tasks.length,
    };

    updatePhase(phaseId, { tasks: [...phase.tasks, newTask] });
  };

  const updateTask = (phaseId: string, taskId: string, updates: Partial<WizardTask>) => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return;

    const updatedTasks = phase.tasks.map(t => 
      t.id === taskId ? { ...t, ...updates } : t
    );
    updatePhase(phaseId, { tasks: updatedTasks });
  };

  const deleteTask = (phaseId: string, taskId: string) => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return;

    updatePhase(phaseId, { tasks: phase.tasks.filter(t => t.id !== taskId) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personalizar Fases e Tarefas</CardTitle>
        <CardDescription>
          Configure as etapas do onboarding e suas tarefas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {phases.map((phase, phaseIndex) => (
            <Collapsible
              key={phase.id}
              open={openPhases.includes(phase.id)}
              onOpenChange={() => togglePhase(phase.id)}
            >
              <div className="border rounded-lg">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{phase.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {phase.tasks.length} tarefas
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {phase.duration_days} dias
                        </Badge>
                      </div>
                    </div>
                    <ChevronDown className={cn(
                      'h-4 w-4 transition-transform',
                      openPhases.includes(phase.id) && 'rotate-180'
                    )} />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-4 border-t pt-4">
                    {/* Configurações da Fase */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Nome da Fase</Label>
                        <Input
                          value={phase.name}
                          onChange={(e) => updatePhase(phase.id, { name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Duração (dias)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={phase.duration_days}
                          onChange={(e) => updatePhase(phase.id, { duration_days: parseInt(e.target.value) || 1 })}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deletePhase(phase.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remover Fase
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={phase.description}
                        onChange={(e) => updatePhase(phase.id, { description: e.target.value })}
                        placeholder="Descreva o objetivo desta fase..."
                        className="mt-1"
                      />
                    </div>

                    {/* Lista de Tarefas */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <ListTodo className="h-4 w-4" />
                          Tarefas
                        </Label>
                        <Button size="sm" variant="outline" onClick={() => addTask(phase.id)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar Tarefa
                        </Button>
                      </div>

                      {phase.tasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhuma tarefa. Clique em "Adicionar Tarefa" para começar.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {phase.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="p-3 border rounded-lg bg-background space-y-3"
                            >
                              <div className="flex items-start gap-3">
                                <GripVertical className="h-4 w-4 text-muted-foreground mt-2" />
                                <div className="flex-1 space-y-3">
                                  <Input
                                    value={task.title}
                                    onChange={(e) => updateTask(phase.id, task.id, { title: e.target.value })}
                                    placeholder="Título da tarefa"
                                  />
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <Select
                                      value={task.responsible_type}
                                      onValueChange={(value: OnboardingResponsibleType) => 
                                        updateTask(phase.id, task.id, { responsible_type: value })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="rh">RH</SelectItem>
                                        <SelectItem value="leader">Líder</SelectItem>
                                        <SelectItem value="employee">Colaborador</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={task.is_required}
                                        onCheckedChange={(checked) => 
                                          updateTask(phase.id, task.id, { is_required: checked })
                                        }
                                      />
                                      <Label className="text-sm">Obrigatória</Label>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => deleteTask(phase.id, task.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}

          {phases.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma fase definida.</p>
              <p className="text-sm">Adicione fases para estruturar o onboarding.</p>
            </div>
          )}
        </div>

        <Button variant="outline" onClick={addPhase} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Nova Fase
        </Button>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
          <Button onClick={onNext} disabled={phases.length === 0}>
            Próximo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
