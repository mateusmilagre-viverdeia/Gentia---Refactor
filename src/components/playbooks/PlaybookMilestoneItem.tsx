import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PlaybookMilestoneWithChecklist, PlaybookChecklistItem, PILLAR_CONFIG, PillarType } from '@/types/playbook.types';
import { ChecklistItemEditor, NewChecklistItemInput } from './ChecklistItemEditor';
import { GripVertical, ChevronDown, ChevronRight, Edit, Trash2, ListChecks, Clock, Flag } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';

interface PlaybookMilestoneItemProps {
  milestone: PlaybookMilestoneWithChecklist;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onAddChecklistItem: (title: string) => Promise<void>;
  onUpdateChecklistItem: (id: string, updates: Partial<PlaybookChecklistItem>) => Promise<boolean>;
  onDeleteChecklistItem: (id: string) => Promise<boolean>;
  onReorderChecklistItems: (itemIds: string[]) => Promise<boolean>;
}

const MILESTONE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  pillar: { label: 'Pilar', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  checkpoint: { label: 'Checkpoint', color: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
  phase: { label: 'Fase', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  custom: { label: 'Personalizado', color: 'bg-gray-500/10 text-gray-500 border-gray-500/30' },
};

export function PlaybookMilestoneItem({
  milestone,
  onEdit,
  onDelete,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
  onReorderChecklistItems,
}: PlaybookMilestoneItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: milestone.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleChecklistDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = milestone.checklist_items.findIndex(item => item.id === active.id);
      const newIndex = milestone.checklist_items.findIndex(item => item.id === over.id);
      const newOrder = arrayMove(milestone.checklist_items, oldIndex, newIndex);
      onReorderChecklistItems(newOrder.map(item => item.id));
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete();
    } finally {
      setLoading(false);
    }
  };

  const typeConfig = MILESTONE_TYPE_LABELS[milestone.milestone_type] || MILESTONE_TYPE_LABELS.custom;
  const pillarConfig = milestone.pillar ? PILLAR_CONFIG[milestone.pillar as PillarType] : null;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        ref={setNodeRef}
        style={style}
        className={`border rounded-lg bg-card ${isDragging ? 'shadow-lg' : ''}`}
      >
        <div className="flex items-center gap-2 p-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab p-1 text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">{milestone.milestone_name}</span>
              <Badge variant="outline" className={typeConfig.color}>
                {typeConfig.label}
              </Badge>
              {pillarConfig && (
                <Badge 
                  variant="outline" 
                  className="border"
                  style={{ 
                    backgroundColor: `${pillarConfig.color}15`,
                    color: pillarConfig.color,
                    borderColor: `${pillarConfig.color}50`,
                  }}
                >
                  {pillarConfig.label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Dia {milestone.relative_start_days} · {milestone.duration_days}d
              </span>
              {milestone.checklist_items.length > 0 && (
                <span className="flex items-center gap-1">
                  <ListChecks className="h-3 w-3" />
                  {milestone.checklist_items.length} itens
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 text-destructive hover:text-destructive" 
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t px-3 py-2 space-y-1 bg-muted/30">
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <ListChecks className="h-3 w-3" />
              Checklist
            </div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleChecklistDragEnd}
            >
              <SortableContext
                items={milestone.checklist_items.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {milestone.checklist_items.map(item => (
                  <ChecklistItemEditor
                    key={item.id}
                    item={item}
                    onUpdate={(updates) => onUpdateChecklistItem(item.id, updates)}
                    onDelete={() => onDeleteChecklistItem(item.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <NewChecklistItemInput onAdd={onAddChecklistItem} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
