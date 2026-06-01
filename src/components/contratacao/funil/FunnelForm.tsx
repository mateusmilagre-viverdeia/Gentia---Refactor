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
import { HiringFunnel } from '@/types/hiring-funnel.types';

interface FunnelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, description?: string, copyFromFunnelId?: string) => void;
  existingFunnels: HiringFunnel[];
  editingFunnel?: HiringFunnel | null;
  onUpdate?: (name: string, description?: string) => void;
}

export function FunnelForm({
  open,
  onOpenChange,
  onSubmit,
  existingFunnels,
  editingFunnel,
  onUpdate,
}: FunnelFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [copyFrom, setCopyFrom] = useState<string>('');

  const isEditing = !!editingFunnel;

  useEffect(() => {
    if (open) {
      if (editingFunnel) {
        setName(editingFunnel.name);
        setDescription(editingFunnel.description || '');
        setCopyFrom('');
      } else {
        setName('');
        setDescription('');
        setCopyFrom('');
      }
    }
  }, [open, editingFunnel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEditing && onUpdate) {
      onUpdate(name.trim(), description.trim() || undefined);
    } else {
      onSubmit(name.trim(), description.trim() || undefined, copyFrom || undefined);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Funil' : 'Novo Funil'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="funnel-name">Nome do funil *</Label>
            <Input
              id="funnel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vendas, Tecnologia, Marketing..."
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="funnel-description">Descrição (opcional)</Label>
            <Textarea
              id="funnel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo deste funil..."
              rows={2}
            />
          </div>

          {!isEditing && existingFunnels.length > 0 && (
            <div className="space-y-2">
              <Label>Copiar etapas de</Label>
              <Select value={copyFrom} onValueChange={setCopyFrom}>
                <SelectTrigger>
                  <SelectValue placeholder="Etapas padrão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Etapas padrão</SelectItem>
                  {existingFunnels.map((funnel) => (
                    <SelectItem key={funnel.id} value={funnel.id}>
                      {funnel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Copie as etapas de um funil existente ou use as etapas padrão
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {isEditing ? 'Salvar' : 'Criar Funil'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
