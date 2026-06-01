import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlaybookMilestone, CreateMilestoneInput, MilestoneType, PillarType, PILLAR_CONFIG } from '@/types/playbook.types';
import { Loader2 } from 'lucide-react';

interface PlaybookMilestoneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone?: PlaybookMilestone;
  phaseId: string;
  nextOrderIndex: number;
  onSubmit: (data: CreateMilestoneInput | Partial<PlaybookMilestone>) => Promise<void>;
}

const MILESTONE_TYPES: { value: MilestoneType; label: string }[] = [
  { value: 'pillar', label: 'Pilar' },
  { value: 'checkpoint', label: 'Checkpoint' },
  { value: 'phase', label: 'Marco de Fase' },
  { value: 'custom', label: 'Personalizado' },
];

export function PlaybookMilestoneFormDialog({
  open,
  onOpenChange,
  milestone,
  phaseId,
  nextOrderIndex,
  onSubmit,
}: PlaybookMilestoneFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    milestone_name: '',
    description: '',
    milestone_type: 'checkpoint' as MilestoneType,
    pillar: null as PillarType | null,
    relative_start_days: 0,
    duration_days: 7,
  });

  const isEditing = !!milestone;

  useEffect(() => {
    if (open) {
      if (milestone) {
        setFormData({
          milestone_name: milestone.milestone_name,
          description: milestone.description || '',
          milestone_type: milestone.milestone_type,
          pillar: milestone.pillar,
          relative_start_days: milestone.relative_start_days,
          duration_days: milestone.duration_days,
        });
      } else {
        setFormData({
          milestone_name: '',
          description: '',
          milestone_type: 'checkpoint',
          pillar: null,
          relative_start_days: 0,
          duration_days: 7,
        });
      }
    }
  }, [open, milestone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.milestone_name.trim()) return;

    setLoading(true);
    try {
      if (isEditing) {
        await onSubmit({
          milestone_name: formData.milestone_name.trim(),
          description: formData.description.trim() || null,
          milestone_type: formData.milestone_type,
          pillar: formData.milestone_type === 'pillar' ? formData.pillar : null,
          relative_start_days: formData.relative_start_days,
          duration_days: formData.duration_days,
        });
      } else {
        await onSubmit({
          phase_id: phaseId,
          milestone_name: formData.milestone_name.trim(),
          description: formData.description.trim() || undefined,
          milestone_type: formData.milestone_type,
          pillar: formData.milestone_type === 'pillar' ? formData.pillar || undefined : undefined,
          relative_start_days: formData.relative_start_days,
          duration_days: formData.duration_days,
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Marco' : 'Novo Marco'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações do marco.' : 'Adicione um novo marco à fase.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Marco *</Label>
            <Input
              id="name"
              value={formData.milestone_name}
              onChange={(e) => setFormData(prev => ({ ...prev, milestone_name: e.target.value }))}
              placeholder="Ex: Reunião de Kickoff"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.milestone_type}
                onValueChange={(v) => setFormData(prev => ({ ...prev, milestone_type: v as MilestoneType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MILESTONE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.milestone_type === 'pillar' && (
              <div className="space-y-2">
                <Label htmlFor="pillar">Pilar</Label>
                <Select
                  value={formData.pillar || ''}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, pillar: v as PillarType }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PILLAR_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: config.color }}
                          />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva o objetivo deste marco..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Início Relativo (dias)</Label>
              <Input
                id="start"
                type="number"
                min={0}
                value={formData.relative_start_days}
                onChange={(e) => setFormData(prev => ({ ...prev, relative_start_days: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">Dias após o início da fase</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duração (dias)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                value={formData.duration_days}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.milestone_name.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar' : 'Criar Marco'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
