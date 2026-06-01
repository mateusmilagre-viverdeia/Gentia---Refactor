import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Plus, GripVertical, RotateCcw, Home } from 'lucide-react';
import { useValuesQuestions } from '@/contexts/ValuesQuestionsContext';
import { QuestionItemRow } from './QuestionItemRow';
import { ValuesQuestionsProgress } from './ValuesQuestionsProgress';
import { ValuesQuestionItem } from '@/types/values-questions.types';
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

interface SortableItemProps {
  item: ValuesQuestionItem;
  index: number;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onToggleThinkingTime: (id: string, value: boolean) => void;
}

function SortableItem({ item, index, onUpdate, onDelete, onToggleThinkingTime }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground p-1">
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <QuestionItemRow
          item={item}
          index={index}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onToggleThinkingTime={onToggleThinkingTime}
          showValueLabel={true}
        />
      </div>
    </div>
  );
}

export function ValuesQuestionsReview() {
  const { 
    session, 
    items, 
    updateStage, 
    updateItem, 
    deleteItem, 
    reorderItems,
    toggleThinkingTime,
    addItem,
    resetSession 
  } = useValuesQuestions();
  const navigate = useNavigate();
  
  const [orderedItems, setOrderedItems] = useState<ValuesQuestionItem[]>([]);
  const [customQuestion, setCustomQuestion] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    // Sort items by stage_number first, then by position
    const sorted = [...items].sort((a, b) => {
      if (a.stage_number !== b.stage_number) {
        return a.stage_number - b.stage_number;
      }
      return (a.position || 0) - (b.position || 0);
    });
    setOrderedItems(sorted);
  }, [items]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedItems.findIndex(item => item.id === active.id);
      const newIndex = orderedItems.findIndex(item => item.id === over.id);
      
      const newOrder = arrayMove(orderedItems, oldIndex, newIndex);
      setOrderedItems(newOrder);
      await reorderItems(newOrder);
    }
  };

  const handleAddCustom = async () => {
    if (!customQuestion.trim()) return;
    await addItem(4, customQuestion.trim(), 'custom');
    setCustomQuestion('');
  };

  const getStageLabel = (stageNumber: number) => {
    switch (stageNumber) {
      case 1: return 'Perguntas Iniciais';
      case 2: return 'Coringas Iniciais';
      case 3: return 'Por Valor';
      case 4: return 'Coringas Finais';
      default: return '';
    }
  };

  // Group items by stage for display
  const groupedItems: Record<number, ValuesQuestionItem[]> = {};
  orderedItems.forEach(item => {
    if (!groupedItems[item.stage_number]) {
      groupedItems[item.stage_number] = [];
    }
    groupedItems[item.stage_number].push(item);
  });

  return (
    <div className="space-y-6">
      <ValuesQuestionsProgress 
        currentStage={5} 
        totalValueStages={session?.working_values?.length || 0}
        maxReachedStage={session?.stage}
        onStageClick={updateStage}
      />

      <Card>
        <CardHeader>
          <CardTitle>Revisão do Questionário</CardTitle>
          <CardDescription>
            Total: {orderedItems.length} perguntas • Arraste para reordenar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedItems.map(i => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {orderedItems.map((item, index) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    index={index}
                    onUpdate={updateItem}
                    onDelete={deleteItem}
                    onToggleThinkingTime={toggleThinkingTime}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {orderedItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma pergunta selecionada ainda.
            </div>
          )}

          {/* Add new question */}
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">
              Adicionar nova pergunta
            </h4>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Digite sua pergunta..."
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              />
              <Button onClick={handleAddCustom} disabled={!customQuestion.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate('/atracao-contratacao/contratacao')}>
            <Home className="h-4 w-4 mr-2" />
            Sair
          </Button>
          <Button variant="outline" onClick={() => updateStage(4)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={resetSession}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Recomeçar
          </Button>
          <Button onClick={() => updateStage(6)} disabled={orderedItems.length === 0}>
            Finalizar
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
