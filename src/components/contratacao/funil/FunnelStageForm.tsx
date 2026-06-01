import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AutomationStepType, AUTOMATION_STEP_LABELS } from '@/types/hiring-funnel.types';

interface FunnelStageFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, description?: string, stepType?: AutomationStepType | null) => void;
  title: string;
  initialName?: string;
  initialDescription?: string;
  initialStepType?: AutomationStepType | null;
}

export function FunnelStageForm({
  open,
  onOpenChange,
  onSubmit,
  title,
  initialName = '',
  initialDescription = '',
  initialStepType = null,
}: FunnelStageFormProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [stepType, setStepType] = useState<AutomationStepType | null>(initialStepType);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setDescription(initialDescription);
      setStepType(initialStepType);
    }
  }, [open, initialName, initialDescription, initialStepType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), description.trim() || undefined, stepType);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stage-name">Nome da etapa *</Label>
            <Input
              id="stage-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Entrevista Cultural"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stage-description">Descrição (opcional)</Label>
            <Textarea
              id="stage-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas ou instruções para esta etapa..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="step-type">Automação (opcional)</Label>
            <Select
              value={stepType || "none"}
              onValueChange={(value) => setStepType(value === "none" ? null : value as AutomationStepType)}
            >
              <SelectTrigger id="step-type">
                <SelectValue placeholder="Selecione o tipo de automação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Manual (sem automação)</SelectItem>
                {(Object.entries(AUTOMATION_STEP_LABELS) as [AutomationStepType, string][]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Vincule esta etapa a uma automação para avanço/reprovação automática baseada em thresholds.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
