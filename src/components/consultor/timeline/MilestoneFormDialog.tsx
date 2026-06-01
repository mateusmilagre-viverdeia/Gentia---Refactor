import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectMilestone, MilestoneStatus, MilestoneType, PILLAR_CONFIG } from '@/types/project-timeline.types';

interface MilestoneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<ProjectMilestone>) => Promise<void>;
  accountId: string;
  milestone?: ProjectMilestone;
}

export function MilestoneFormDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  accountId,
  milestone 
}: MilestoneFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<ProjectMilestone>>({
    milestone_name: milestone?.milestone_name || '',
    description: milestone?.description || '',
    milestone_type: milestone?.milestone_type || 'custom',
    pillar: milestone?.pillar || '',
    planned_start: milestone?.planned_start || '',
    planned_end: milestone?.planned_end || '',
    status: milestone?.status || 'pending',
    responsible: milestone?.responsible || '',
    progress_percentage: milestone?.progress_percentage || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        pillar: formData.pillar || null,
        planned_start: formData.planned_start || null,
        planned_end: formData.planned_end || null,
        responsible: formData.responsible || null,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{milestone ? 'Editar Marco' : 'Novo Marco'}</DialogTitle>
          <DialogDescription>
            {milestone 
              ? 'Atualize as informações do marco do projeto.'
              : 'Adicione um novo marco à timeline do projeto.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Marco *</Label>
            <Input
              id="name"
              value={formData.milestone_name}
              onChange={(e) => updateField('milestone_name', e.target.value)}
              placeholder="Ex: Workshop de Valores"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Descreva o objetivo deste marco..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={formData.milestone_type} 
                onValueChange={(v) => updateField('milestone_type', v as MilestoneType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pillar">Pilar</SelectItem>
                  <SelectItem value="phase">Fase</SelectItem>
                  <SelectItem value="checkpoint">Checkpoint</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pilar Relacionado</Label>
              <Select 
                value={formData.pillar || 'none'} 
                onValueChange={(v) => updateField('pillar', v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {Object.entries(PILLAR_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="planned_start">Data Início</Label>
              <Input
                id="planned_start"
                type="date"
                value={formData.planned_start || ''}
                onChange={(e) => updateField('planned_start', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="planned_end">Data Fim</Label>
              <Input
                id="planned_end"
                type="date"
                value={formData.planned_end || ''}
                onChange={(e) => updateField('planned_end', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => updateField('status', v as MilestoneStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="progress">Progresso (%)</Label>
              <Input
                id="progress"
                type="number"
                min={0}
                max={100}
                value={formData.progress_percentage}
                onChange={(e) => updateField('progress_percentage', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsible">Responsável</Label>
            <Input
              id="responsible"
              value={formData.responsible || ''}
              onChange={(e) => updateField('responsible', e.target.value)}
              placeholder="Nome do responsável"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.milestone_name}>
              {loading ? 'Salvando...' : milestone ? 'Salvar' : 'Criar Marco'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
