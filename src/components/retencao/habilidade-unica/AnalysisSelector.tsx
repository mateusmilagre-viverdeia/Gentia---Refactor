import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { AnalysisForm } from './AnalysisForm';
import type { UniqueAbilityAnalysis } from '@/types/unique-ability.types';

interface AnalysisSelectorProps {
  analyses: UniqueAbilityAnalysis[];
  selectedAnalysis: UniqueAbilityAnalysis | null;
  onSelect: (analysis: UniqueAbilityAnalysis | null) => void;
  onCreate: (name: string, description?: string) => Promise<UniqueAbilityAnalysis | null>;
  onUpdate: (id: string, name: string, description?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function AnalysisSelector({
  analyses,
  selectedAnalysis,
  onSelect,
  onCreate,
  onUpdate,
  onDelete
}: AnalysisSelectorProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const handleCreate = async (name: string, description?: string) => {
    const analysis = await onCreate(name, description);
    if (analysis) {
      setShowCreate(false);
    }
  };

  const handleUpdate = async (name: string, description?: string) => {
    if (selectedAnalysis) {
      await onUpdate(selectedAnalysis.id, name, description);
      setShowEdit(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Select
        value={selectedAnalysis?.id || ''}
        onValueChange={(value) => {
          const analysis = analyses.find(a => a.id === value);
          onSelect(analysis || null);
        }}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Selecione uma análise" />
        </SelectTrigger>
        <SelectContent>
          {analyses.map(analysis => (
            <SelectItem key={analysis.id} value={analysis.id}>
              {analysis.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={() => setShowCreate(true)}
      >
        <Plus className="h-4 w-4" />
      </Button>

      {selectedAnalysis && (
        <>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowEdit(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir análise?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Todas as atividades e versões serão excluídas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(selectedAnalysis.id)}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      <AnalysisForm
        open={showCreate}
        onOpenChange={setShowCreate}
        onSubmit={handleCreate}
        title="Nova Análise"
      />

      <AnalysisForm
        open={showEdit}
        onOpenChange={setShowEdit}
        onSubmit={handleUpdate}
        title="Editar Análise"
        defaultName={selectedAnalysis?.name}
        defaultDescription={selectedAnalysis?.description || undefined}
      />
    </div>
  );
}
