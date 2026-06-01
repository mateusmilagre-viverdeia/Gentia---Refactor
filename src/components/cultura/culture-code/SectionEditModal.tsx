import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { StructureSection } from '@/types/culture-code.types';

interface SectionEditModalProps {
  section: StructureSection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (sectionId: string, updates: Partial<StructureSection>) => void;
}

export function SectionEditModal({ 
  section, 
  open, 
  onOpenChange, 
  onSave 
}: SectionEditModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedSlides, setEstimatedSlides] = useState(1);

  useEffect(() => {
    if (section) {
      setName(section.name);
      setDescription(section.description);
      setEstimatedSlides(section.estimatedSlides);
    }
  }, [section]);

  const handleSave = () => {
    if (!section) return;
    
    onSave(section.id, {
      name: name.trim(),
      description: description.trim(),
      estimatedSlides: Math.max(1, Math.min(20, estimatedSlides)),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Seção</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="section-name">Nome da Seção</Label>
            <Input
              id="section-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Abertura"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="section-description">Descrição</Label>
            <Textarea
              id="section-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o conteúdo desta seção..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="section-slides">Quantidade de Slides</Label>
            <Input
              id="section-slides"
              type="number"
              min={1}
              max={20}
              value={estimatedSlides}
              onChange={(e) => setEstimatedSlides(parseInt(e.target.value) || 1)}
            />
            <p className="text-xs text-muted-foreground">Mínimo: 1, Máximo: 20</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
