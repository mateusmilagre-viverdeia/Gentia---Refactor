import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PlaybookPhaseWithMilestones, PlaybookMilestoneWithChecklist, PlaybookChecklistItem } from '@/types/playbook.types';
import { PlaybookMilestoneItem } from './PlaybookMilestoneItem';
import { GripVertical, ChevronDown, ChevronRight, Edit, Trash2, Plus, Calendar, Target } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';

interface PlaybookPhaseCardProps {
  phase: PlaybookPhaseWithMilestones;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onAddMilestone: () => void;
  onEditMilestone: (milestone: PlaybookMilestoneWithChecklist) => void;
  onDeleteMilestone: (milestoneId: string) => Promise<void>;
  onReorderMilestones: (milestoneIds: string[]) => Promise<boolean>;
  onAddChecklistItem: (milestoneId: string, title: string) => Promise<void>;
  onUpdateChecklistItem: (id: string, updates: Partial<PlaybookChecklistItem>) => Promise<boolean>;
  onDeleteChecklistItem: (id: string) => Promise<boolean>;
  onReorderChecklistItems: (milestoneId: string, itemIds: string[]) => Promise<boolean>;
}

export function PlaybookPhaseCard({
  phase,
  onEdit,
  onDelete,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
  onReorderMilestones,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
  onReorderChecklistItems,
}: PlaybookPhaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [loading, setLoading] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id });

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

  const handleMilestoneDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = phase.milestones.findIndex(m => m.id === active.id);
      const newIndex = phase.milestones.findIndex(m => m.id === over.id);
      const newOrder = arrayMove(phase.milestones, oldIndex, newIndex);
      onReorderMilestones(newOrder.map(m => m.id));
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

  const totalChecklistItems = phase.milestones.reduce(
    (acc, m) => acc + m.checklist_items.length,
    0
  );

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card
        ref={setNodeRef}
        style={style}
        className={`overflow-hidden ${isDragging ? 'shadow-lg' : ''}`}
      >
        {/* Phase Header */}
        <div 
          className="flex items-center gap-2 p-4 border-b"
          style={{ borderLeftWidth: '4px', borderLeftColor: phase.color || '#6B7280' }}
        >
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab p-1 text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-5 w-5" />
          </button>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>

          <div 
            className="w-3 h-3 rounded-full flex-shrink-0" 
            style={{ backgroundColor: phase.color || '#6B7280' }}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{phase.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {phase.duration_weeks} {phase.duration_weeks === 1 ? 'semana' : 'semanas'}
              </Badge>
            </div>
            {phase.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                {phase.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              {phase.milestones.length} marcos
            </span>
            {totalChecklistItems > 0 && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {totalChecklistItems} itens
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 ml-2">
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

        {/* Phase Content */}
        <CollapsibleContent>
          <div className="p-4 space-y-3 bg-muted/20">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleMilestoneDragEnd}
            >
              <SortableContext
                items={phase.milestones.map(m => m.id)}
                strategy={verticalListSortingStrategy}
              >
                {phase.milestones.map(milestone => (
                  <PlaybookMilestoneItem
                    key={milestone.id}
                    milestone={milestone}
                    onEdit={() => onEditMilestone(milestone)}
                    onDelete={() => onDeleteMilestone(milestone.id)}
                    onAddChecklistItem={(title) => onAddChecklistItem(milestone.id, title)}
                    onUpdateChecklistItem={onUpdateChecklistItem}
                    onDeleteChecklistItem={onDeleteChecklistItem}
                    onReorderChecklistItems={(itemIds) => onReorderChecklistItems(milestone.id, itemIds)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {phase.milestones.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum marco nesta fase</p>
              </div>
            )}

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={onAddMilestone}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Marco
            </Button>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
