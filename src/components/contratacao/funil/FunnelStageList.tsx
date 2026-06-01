import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HiringFunnelStage } from '@/types/hiring-funnel.types';
import { FunnelStageItem } from './FunnelStageItem';
import { FunnelStageForm } from './FunnelStageForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { AutomationStepType } from '@/types/hiring-funnel.types';

interface FunnelStageListProps {
  stages: HiringFunnelStage[];
  onReorder: (activeId: string, overId: string) => void;
  onAdd: (name: string, description?: string, stepType?: AutomationStepType | null) => void;
  onUpdate: (stageId: string, updates: Partial<Pick<HiringFunnelStage, 'name' | 'description' | 'step_type'>>) => void;
  onDelete: (stageId: string) => void;
}

export function FunnelStageList({ stages, onReorder, onAdd, onUpdate, onDelete }: FunnelStageListProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<HiringFunnelStage | null>(null);
  const [deleteStageId, setDeleteStageId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string);
    }
  };

  const handleAddSubmit = (name: string, description?: string, stepType?: AutomationStepType | null) => {
    onAdd(name, description, stepType);
    setIsAddOpen(false);
  };

  const handleEditSubmit = (name: string, description?: string, stepType?: AutomationStepType | null) => {
    if (editingStage) {
      onUpdate(editingStage.id, { name, description, step_type: stepType });
      setEditingStage(null);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteStageId) {
      onDelete(deleteStageId);
      setDeleteStageId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {stages.length} {stages.length === 1 ? 'etapa' : 'etapas'}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Etapa
        </Button>
      </div>

      {stages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Nenhuma etapa definida</p>
          <p className="text-xs mt-1">Clique em "Adicionar Etapa" para começar</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={stages.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {stages.map((stage) => (
                <FunnelStageItem
                  key={stage.id}
                  stage={stage}
                  onEdit={setEditingStage}
                  onDelete={setDeleteStageId}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Stage Dialog */}
      <FunnelStageForm
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubmit={handleAddSubmit}
        title="Adicionar Etapa"
      />

      {/* Edit Stage Dialog */}
      <FunnelStageForm
        open={!!editingStage}
        onOpenChange={(open) => !open && setEditingStage(null)}
        onSubmit={handleEditSubmit}
        title="Editar Etapa"
        initialName={editingStage?.name}
        initialDescription={editingStage?.description || ''}
        initialStepType={editingStage?.step_type as AutomationStepType | null}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteStageId} onOpenChange={(open) => !open && setDeleteStageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etapa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A etapa será removida permanentemente do funil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
