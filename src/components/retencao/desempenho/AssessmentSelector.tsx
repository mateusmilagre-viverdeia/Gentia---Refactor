import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Save, History } from 'lucide-react';
import type { PerformanceAssessment } from '@/types/performance-assessment.types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AssessmentSelectorProps {
  assessments: PerformanceAssessment[];
  selectedAssessment: PerformanceAssessment | null;
  onSelect: (assessment: PerformanceAssessment) => void;
  onCreate: (name: string, description?: string) => Promise<PerformanceAssessment | null>;
  onDelete: (id: string) => void;
  onSaveVersion: () => void;
  onOpenHistory: () => void;
}

export function AssessmentSelector({
  assessments,
  selectedAssessment,
  onSelect,
  onCreate,
  onDelete,
  onSaveVersion,
  onOpenHistory,
}: AssessmentSelectorProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    await onCreate(newName.trim(), newDescription.trim() || undefined);
    setIsCreating(false);
    setCreateOpen(false);
    setNewName('');
    setNewDescription('');
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={selectedAssessment?.id || ''}
        onValueChange={(value) => {
          const assessment = assessments.find((a) => a.id === value);
          if (assessment) onSelect(assessment);
        }}
      >
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Selecione uma avaliação" />
        </SelectTrigger>
        <SelectContent>
          {assessments.map((assessment) => (
            <SelectItem key={assessment.id} value={assessment.id}>
              {assessment.name}
            </SelectItem>
          ))}
          {assessments.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Nenhuma avaliação criada
            </div>
          )}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Nova
      </Button>

      {selectedAssessment && (
        <>
          <Button variant="outline" size="sm" onClick={onSaveVersion}>
            <Save className="h-4 w-4 mr-1" />
            Salvar Versão
          </Button>

          <Button variant="outline" size="sm" onClick={onOpenHistory}>
            <History className="h-4 w-4 mr-1" />
            Histórico
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir avaliação?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir "{selectedAssessment.name}"? 
                  Todas as pessoas e o histórico serão removidos permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(selectedAssessment.id)}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Avaliação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da avaliação</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Avaliação Q4 2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Observações sobre esta avaliação..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || isCreating}>
              {isCreating ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
