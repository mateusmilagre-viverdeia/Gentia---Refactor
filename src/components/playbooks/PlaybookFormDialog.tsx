import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectPlaybook, PlaybookCategory, PLAYBOOK_CATEGORY_CONFIG, CreatePlaybookInput } from '@/types/playbook.types';
import { Loader2, Save } from 'lucide-react';

interface PlaybookFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playbook?: ProjectPlaybook;
  onSubmit: (data: CreatePlaybookInput) => Promise<void>;
}

export function PlaybookFormDialog({ open, onOpenChange, playbook, onSubmit }: PlaybookFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreatePlaybookInput>({
    name: '',
    description: '',
    category: 'implementation',
    estimated_duration_weeks: 12,
  });

  const isEditing = !!playbook;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (playbook) {
        setFormData({
          name: playbook.name,
          description: playbook.description || '',
          category: playbook.category,
          estimated_duration_weeks: playbook.estimated_duration_weeks,
          icon: playbook.icon || undefined,
          color: playbook.color || undefined,
        });
      } else {
        setFormData({
          name: '',
          description: '',
          category: 'implementation',
          estimated_duration_weeks: 12,
        });
      }
    }
  }, [open, playbook]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;
    
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof CreatePlaybookInput>(
    field: K,
    value: CreatePlaybookInput[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Playbook' : 'Novo Playbook'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Atualize as informações do playbook.'
              : 'Crie um novo template para padronizar a execução de projetos.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Ex: Implementação Completa"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Descreva o objetivo e uso deste playbook..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => updateField('category', v as PlaybookCategory)}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLAYBOOK_CATEGORY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: config.color }}
                        />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duração (semanas) *</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                max={52}
                value={formData.estimated_duration_weeks}
                onChange={(e) => updateField('estimated_duration_weeks', parseInt(e.target.value) || 1)}
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Salvar' : 'Criar Playbook'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
