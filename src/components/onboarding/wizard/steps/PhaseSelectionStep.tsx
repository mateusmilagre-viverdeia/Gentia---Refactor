import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, Plus, Layers, Clock, ListTodo, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardPhase } from '@/hooks/useOnboardingWizardState';

interface PhaseSelectionStepProps {
  availablePhases: WizardPhase[];
  selectedPhases: WizardPhase[];
  onPhasesChange: (phases: WizardPhase[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function PhaseSelectionStep({
  availablePhases,
  selectedPhases,
  onPhasesChange,
  onBack,
  onNext,
}: PhaseSelectionStepProps) {
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [newPhase, setNewPhase] = useState({
    name: '',
    description: '',
    duration_days: 7,
  });

  const togglePhase = (phase: WizardPhase) => {
    const isSelected = selectedPhases.some(p => p.id === phase.id);
    if (isSelected) {
      onPhasesChange(selectedPhases.filter(p => p.id !== phase.id));
    } else {
      onPhasesChange([...selectedPhases, { ...phase, selected: true }]);
    }
  };

  const addCustomPhase = () => {
    if (!newPhase.name.trim()) return;
    
    const customPhase: WizardPhase = {
      id: `custom-${Date.now()}`,
      name: newPhase.name,
      description: newPhase.description,
      duration_days: newPhase.duration_days,
      order_index: selectedPhases.length,
      tasks: [],
      selected: true,
    };
    
    onPhasesChange([...selectedPhases, customPhase]);
    setNewPhase({ name: '', description: '', duration_days: 7 });
    setIsAddingPhase(false);
  };

  const selectedCount = selectedPhases.length;
  const totalTasks = selectedPhases.reduce((acc, p) => acc + p.tasks.length, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Selecionar Fases do Onboarding
            </CardTitle>
            <CardDescription>
              Escolha as fases que farão parte do processo de integração
            </CardDescription>
          </div>
          <motion.div
            key={selectedCount}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2"
          >
            <Badge variant="default" className="text-sm px-3 py-1">
              <Sparkles className="h-3 w-3 mr-1" />
              {selectedCount} fases
            </Badge>
            {totalTasks > 0 && (
              <Badge variant="outline" className="text-sm">
                {totalTasks} tarefas
              </Badge>
            )}
          </motion.div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Phase cards grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {availablePhases.map((phase, index) => {
              const isSelected = selectedPhases.some(p => p.id === phase.id);
              
              return (
                <motion.div
                  key={phase.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <button
                    onClick={() => togglePhase(phase)}
                    className={cn(
                      'w-full p-4 rounded-lg border-2 text-left transition-all',
                      'hover:border-primary/50 hover:shadow-md',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-background'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}>
                          {isSelected ? <Check className="h-4 w-4" /> : index + 1}
                        </div>
                        <h3 className="font-medium">{phase.name}</h3>
                      </div>
                      <motion.div
                        initial={false}
                        animate={{ scale: isSelected ? 1 : 0 }}
                        className="text-primary"
                      >
                        <Check className="h-5 w-5" />
                      </motion.div>
                    </div>
                    
                    {phase.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {phase.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {phase.duration_days} dias
                      </div>
                      <div className="flex items-center gap-1">
                        <ListTodo className="h-3 w-3" />
                        {phase.tasks.length} tarefas
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Add custom phase button */}
          <Dialog open={isAddingPhase} onOpenChange={setIsAddingPhase}>
            <DialogTrigger asChild>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  'w-full p-4 rounded-lg border-2 border-dashed text-left transition-all',
                  'hover:border-primary/50 hover:bg-muted/50',
                  'flex flex-col items-center justify-center min-h-[140px]'
                )}
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="font-medium">Adicionar Fase Personalizada</span>
                <span className="text-sm text-muted-foreground">
                  Crie uma etapa customizada
                </span>
              </motion.button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Fase Personalizada</DialogTitle>
                <DialogDescription>
                  Crie uma nova fase para o onboarding
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="phase-name">Nome da Fase</Label>
                  <Input
                    id="phase-name"
                    value={newPhase.name}
                    onChange={(e) => setNewPhase(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Treinamento Técnico"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phase-description">Descrição</Label>
                  <Textarea
                    id="phase-description"
                    value={newPhase.description}
                    onChange={(e) => setNewPhase(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva o objetivo desta fase..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phase-duration">Duração (dias)</Label>
                  <Input
                    id="phase-duration"
                    type="number"
                    min={1}
                    value={newPhase.duration_days}
                    onChange={(e) => setNewPhase(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 1 }))}
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingPhase(false)}>
                  Cancelar
                </Button>
                <Button onClick={addCustomPhase} disabled={!newPhase.name.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Fase
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Selected phases summary */}
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-muted/50 rounded-lg"
          >
            <p className="text-sm font-medium mb-2">Fases selecionadas:</p>
            <div className="flex flex-wrap gap-2">
              {selectedPhases.map((phase, index) => (
                <Badge key={phase.id} variant="secondary" className="gap-1">
                  <span className="font-bold">{index + 1}.</span>
                  {phase.name}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
          <Button onClick={onNext} disabled={selectedCount === 0}>
            Configurar Fases
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
