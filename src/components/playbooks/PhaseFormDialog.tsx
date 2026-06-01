import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PlaybookPhase, CreatePhaseInput } from '@/types/playbook.types';
import { Loader2 } from 'lucide-react';

interface PhaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase?: PlaybookPhase;
  playbookId: string;
  nextOrderIndex: number;
  onSubmit: (data: CreatePhaseInput | Partial<PlaybookPhase>) => Promise<void>;
}

const COLOR_OPTIONS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#6366F1',
];

export function PhaseFormDialog({
  open,
  onOpenChange,
  phase,
  playbookId,
  nextOrderIndex,
  onSubmit,
}: PhaseFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_weeks: 2,
    color: COLOR_OPTIONS[0],
  });

  const isEditing = !!phase;

  useEffect(() => {
    if (open) {
      if (phase) {
        setFormData({
          name: phase.name,
          description: phase.description || '',
          duration_weeks: phase.duration_weeks,
          color: phase.color || COLOR_OPTIONS[0],
        });
      } else {
        setFormData({
          name: '',
          description: '',
          duration_weeks: 2,
          color: COLOR_OPTIONS[nextOrderIndex % COLOR_OPTIONS.length],
        });
      }
    }
  }, [open, phase, nextOrderIndex]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      if (isEditing) {
        await onSubmit({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          duration_weeks: formData.duration_weeks,
          color: formData.color,
        });
      } else {
        await onSubmit({
          playbook_id: playbookId,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          duration_weeks: formData.duration_weeks,
          color: formData.color,
          order_index: nextOrderIndex,
        });
      }
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Fase' : 'Nova Fase'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações da fase.' : 'Adicione uma nova fase ao playbook.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Fase *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Descoberta"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva os objetivos desta fase..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duração (semanas)</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              max={52}
              value={formData.duration_weeks}
              onChange={(e) => setFormData(prev => ({ ...prev, duration_weeks: parseInt(e.target.value) || 1 }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    formData.color === color ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar' : 'Criar Fase'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
