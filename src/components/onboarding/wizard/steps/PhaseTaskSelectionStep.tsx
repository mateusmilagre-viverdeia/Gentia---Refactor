import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Check, Plus, ListTodo, Sparkles, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardPhase, WizardTask } from '@/hooks/useOnboardingWizardState';

interface PhaseTaskSelectionStepProps {
  phase: WizardPhase;
  phaseIndex: number;
  totalPhases: number;
  onTaskToggle: (taskId: string, selected: boolean) => void;
  onTaskAdd: (task: WizardTask) => void;
  onTaskUpdate: (taskId: string, updates: Partial<WizardTask>) => void;
  onBack: () => void;
  onNext: () => void;
}

export function PhaseTaskSelectionStep({
  phase,
  phaseIndex,
  totalPhases,
  onTaskToggle,
  onTaskAdd,
  onTaskUpdate,
  onBack,
  onNext,
}: PhaseTaskSelectionStepProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    is_required: false,
  });

  const selectedTasks = phase.tasks.filter(t => t.selected !== false);
  const selectedCount = selectedTasks.length;
  const totalCount = phase.tasks.length;

  const handleAddTask = () => {
    if (!newTask.title.trim()) return;
    
    const task: WizardTask = {
      id: `task-${Date.now()}`,
      title: newTask.title,
      description: '',
      responsible_type: 'rh',
      is_required: newTask.is_required,
      order_index: phase.tasks.length,
      selected: true,
    };
    
    onTaskAdd(task);
    setNewTask({ title: '', is_required: false });
    setIsAddingTask(false);
  };

  const selectAll = () => {
    phase.tasks.forEach(task => {
      if (task.selected === false) {
        onTaskToggle(task.id, true);
      }
    });
  };

  const deselectAll = () => {
    phase.tasks.forEach(task => {
      if (task.selected !== false) {
        onTaskToggle(task.id, false);
      }
    });
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
              <ListTodo className="h-5 w-5" />
              Selecionar Tarefas
            </CardTitle>
            <CardDescription>
              Escolha as tarefas sugeridas ou adicione novas
            </CardDescription>
          </div>
          <motion.div
            key={selectedCount}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="flex flex-col items-end gap-1"
          >
            <Badge variant="default" className="text-sm px-3 py-1">
              <Sparkles className="h-3 w-3 mr-1" />
              {selectedCount} selecionadas
            </Badge>
            <span className="text-xs text-muted-foreground">de {totalCount} sugeridas</span>
          </motion.div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            <Check className="h-3 w-3 mr-1" />
            Selecionar Todas
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Desmarcar Todas
          </Button>
        </div>

        {/* Task list */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          <AnimatePresence mode="popLayout">
            {phase.tasks.map((task, index) => {
              const isSelected = task.selected !== false;
              
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    'p-4 rounded-lg border transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background opacity-60'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => onTaskToggle(task.id, checked as boolean)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'font-medium',
                          !isSelected && 'line-through text-muted-foreground'
                        )}>
                          {task.title}
                        </span>
                        {task.is_required && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            <Star className="h-2.5 w-2.5 mr-0.5" />
                            Obrigatória
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-2"
                      >
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={task.is_required}
                            onCheckedChange={(checked) => onTaskUpdate(task.id, { is_required: checked })}
                            id={`required-${task.id}`}
                          />
                          <Label htmlFor={`required-${task.id}`} className="text-xs text-muted-foreground">
                            Obrigatória
                          </Label>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Empty state */}
          {phase.tasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma tarefa sugerida para esta fase.</p>
              <p className="text-sm">Adicione tarefas personalizadas.</p>
            </div>
          )}
        </div>

        {/* Add custom task */}
        <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Tarefa Personalizada
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Tarefa</DialogTitle>
              <DialogDescription>
                Adicione uma tarefa personalizada para a fase {phase.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="task-title">Título da Tarefa</Label>
                <Input
                  id="task-title"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Revisar documentação do projeto"
                  className="mt-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newTask.is_required}
                  onCheckedChange={(checked) => setNewTask(prev => ({ ...prev, is_required: checked }))}
                  id="new-task-required"
                />
                <Label htmlFor="new-task-required">Tarefa obrigatória</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingTask(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddTask} disabled={!newTask.title.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Tarefa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
          <Button onClick={onNext} disabled={selectedCount === 0}>
            Definir Responsáveis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
