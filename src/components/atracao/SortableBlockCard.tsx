import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentBlockCard } from "./ContentBlockCard";
import type { ContentBlock } from "@/lib/parseContentBlocks";
import { cn } from "@/lib/utils";

interface SortableBlockCardProps {
  block: ContentBlock;
  onRefine: (blockId: string) => void;
  onEdit: (blockId: string) => void;
  onHide: (blockId: string) => void;
  disabled?: boolean;
}

export function SortableBlockCard({
  block,
  onRefine,
  onEdit,
  onHide,
  disabled,
}: SortableBlockCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "opacity-50 z-50"
      )}
    >
      {/* Drag handle and hide button overlay */}
      <div className="absolute left-0 top-0 bottom-0 flex items-start pt-4 -ml-10 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onHide(block.id)}
            disabled={disabled}
            title="Ocultar seção"
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ContentBlockCard
        block={block}
        onRefine={onRefine}
        onEdit={onEdit}
        disabled={disabled}
        showRefineButton={true}
        showEditButton={true}
      />
    </div>
  );
}
