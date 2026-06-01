import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HiringFunnelStage } from '@/types/hiring-funnel.types';

interface FunnelStageItemProps {
  stage: HiringFunnelStage;
  onEdit: (stage: HiringFunnelStage) => void;
  onDelete: (stageId: string) => void;
}

export function FunnelStageItem({ stage, onEdit, onDelete }: FunnelStageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border rounded-lg group hover:border-primary/30 transition-colors"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Position indicator */}
      <span className="w-6 h-6 flex items-center justify-center text-xs font-medium bg-muted rounded-full">
        {stage.position}
      </span>

      {/* Stage info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{stage.name}</p>
        {stage.description && (
          <p className="text-xs text-muted-foreground truncate">{stage.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(stage)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(stage.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
