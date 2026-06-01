import { useState, useCallback } from 'react';
import { Plus, Trash2, GripVertical, CheckCircle2, Circle, MessageSquare, Target, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MeetingItem, MeetingItemType } from '@/hooks/useOneOnOneMeetings';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface AgendaEditorProps {
  items: MeetingItem[];
  onAddItem: (type: MeetingItemType, content: string, dueDate?: string) => void;
  onUpdateItem: (itemId: string, data: Partial<MeetingItem>) => void;
  onToggleComplete: (itemId: string, currentValue: boolean) => void;
  onDeleteItem: (itemId: string) => void;
  onReorder?: (items: MeetingItem[]) => void;
  readOnly?: boolean;
}

const itemTypeConfig: Record<MeetingItemType, { label: string; icon: typeof MessageSquare; color: string }> = {
  topic: { label: 'Tópico', icon: MessageSquare, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  action: { label: 'Ação', icon: Target, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  feedback: { label: 'Feedback', icon: FileText, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  blocker: { label: 'Bloqueio', icon: AlertTriangle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

interface SortableItemProps {
  item: MeetingItem;
  onToggleComplete: (itemId: string, currentValue: boolean) => void;
  onDeleteItem: (itemId: string) => void;
  readOnly?: boolean;
}

function SortableItem({ item, onToggleComplete, onDeleteItem, readOnly }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = itemTypeConfig[item.item_type];
  const Icon = config.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border bg-card transition-all",
        isDragging && "opacity-50 shadow-lg",
        item.is_completed && "opacity-60"
      )}
    >
      {!readOnly && (
        <button
          className="mt-1 cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      
      {item.item_type === 'action' && (
        <button
          onClick={() => onToggleComplete(item.id, item.is_completed)}
          className="mt-1 text-muted-foreground hover:text-foreground"
          disabled={readOnly}
        >
          {item.is_completed ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className={cn("text-xs", config.color)}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
          {item.due_date && (
            <span className="text-xs text-muted-foreground">
              Prazo: {new Date(item.due_date).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
        <p className={cn(
          "text-sm",
          item.is_completed && "line-through text-muted-foreground"
        )}>
          {item.content}
        </p>
      </div>
      
      {!readOnly && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDeleteItem(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function AgendaEditor({
  items,
  onAddItem,
  onUpdateItem,
  onToggleComplete,
  onDeleteItem,
  onReorder,
  readOnly = false,
}: AgendaEditorProps) {
  const [newItemType, setNewItemType] = useState<MeetingItemType>('topic');
  const [newItemContent, setNewItemContent] = useState('');
  const [newItemDueDate, setNewItemDueDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && onReorder) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const reorderedItems = arrayMove(items, oldIndex, newIndex);
      onReorder(reorderedItems);
    }
  }, [items, onReorder]);

  const handleAddItem = useCallback(() => {
    if (!newItemContent.trim()) return;
    
    onAddItem(newItemType, newItemContent.trim(), newItemDueDate || undefined);
    setNewItemContent('');
    setNewItemDueDate('');
    setIsAdding(false);
  }, [newItemType, newItemContent, newItemDueDate, onAddItem]);

  const groupedItems = {
    topics: items.filter(i => i.item_type === 'topic'),
    actions: items.filter(i => i.item_type === 'action'),
    feedback: items.filter(i => i.item_type === 'feedback'),
    blockers: items.filter(i => i.item_type === 'blocker'),
  };

  return (
    <div className="space-y-4">
      {/* Add new item */}
      {!readOnly && (
        <Card>
          <CardContent className="pt-4">
            {!isAdding ? (
              <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar item à pauta
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Select value={newItemType} onValueChange={(v) => setNewItemType(v as MeetingItemType)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(itemTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {newItemType === 'action' && (
                    <Input
                      type="date"
                      value={newItemDueDate}
                      onChange={(e) => setNewItemDueDate(e.target.value)}
                      className="w-[160px]"
                      placeholder="Prazo"
                    />
                  )}
                </div>
                
                <Textarea
                  placeholder="Descreva o item..."
                  value={newItemContent}
                  onChange={(e) => setNewItemContent(e.target.value)}
                  className="min-h-[80px]"
                />
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAdding(false);
                      setNewItemContent('');
                      setNewItemDueDate('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddItem}
                    disabled={!newItemContent.trim()}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Items list with drag and drop */}
      {items.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map(i => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {items.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onToggleComplete={onToggleComplete}
                  onDeleteItem={onDeleteItem}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum item na pauta ainda.</p>
          {!readOnly && (
            <p className="text-sm">Adicione tópicos, ações ou feedbacks.</p>
          )}
        </div>
      )}
    </div>
  );
}
