import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PulseAlert } from '@/hooks/usePulseMetrics';
import type { CreateActionInput } from '@/hooks/usePulseActions';
import { ClipboardList } from 'lucide-react';

interface CreateActionFromAlertDialogProps {
  alert: PulseAlert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateAction: (input: CreateActionInput) => Promise<any>;
}

export function CreateActionFromAlertDialog({ alert, open, onOpenChange, onCreateAction }: CreateActionFromAlertDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [saving, setSaving] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && alert) {
      setTitle(`Ação: ${alert.title}`);
      setDescription(alert.description || '');
      setPriority(alert.severity === 'critical' ? 'high' : 'medium');
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !alert) return;
    setSaving(true);
    try {
      await onCreateAction({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        related_driver_id: alert.related_driver_id || undefined,
        related_pillar_id: alert.related_pillar_id || undefined,
      });
      onOpenChange(false);
      setTitle('');
      setDescription('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Criar Plano de Ação
          </DialogTitle>
          <DialogDescription>
            Vincule um plano de ação a este alerta para acompanhamento.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da ação" />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !title.trim()}>
            {saving ? 'Criando...' : 'Criar Ação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
