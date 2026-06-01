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
import type { OrgChart } from '@/types/org-chart.types';

interface OrgChartFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, description?: string) => void;
  onUpdate?: (name: string, description?: string) => void;
  editingChart?: OrgChart | null;
  portalContainer?: HTMLElement | null;
}

export function OrgChartForm({
  open,
  onOpenChange,
  onSubmit,
  onUpdate,
  editingChart,
  portalContainer,
}: OrgChartFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (editingChart) {
      setName(editingChart.name);
      setDescription(editingChart.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [editingChart, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingChart && onUpdate) {
      onUpdate(name, description || undefined);
    } else {
      onSubmit(name, description || undefined);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent container={portalContainer}>
        <DialogHeader>
          <DialogTitle>
            {editingChart ? 'Editar Organograma' : 'Novo Organograma'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Organograma Geral"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva o propósito deste organograma"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingChart ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
