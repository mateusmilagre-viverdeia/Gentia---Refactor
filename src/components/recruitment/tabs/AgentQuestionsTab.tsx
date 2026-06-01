import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ChevronUp, ChevronDown, GripVertical, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ValuesQuestionsSyncBanner } from "./ValuesQuestionsSyncBanner";

interface AgentQuestion {
  id: string;
  order: number;
  content: string;
}

interface AgentQuestionsTabProps {
  questions: AgentQuestion[];
  isEditing: boolean;
  onQuestionsChange: (questions: AgentQuestion[]) => void;
  agentId?: string;
  agentType?: "cultural" | "technical" | "disc";
}

interface SortableQuestionProps {
  question: AgentQuestion;
  index: number;
  total: number;
  isEditing: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChange: (content: string) => void;
  onDelete: () => void;
}

const SortableQuestion = ({
  question,
  index,
  total,
  isEditing,
  onMoveUp,
  onMoveDown,
  onChange,
  onDelete,
}: SortableQuestionProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 p-4 border rounded-lg bg-background"
    >
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-medium text-muted-foreground w-6 text-center">
          {index + 1}
        </span>
        {isEditing && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onMoveUp}
              disabled={index === 0}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onMoveDown}
              disabled={index === total - 1}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {isEditing && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 space-y-2">
        {isEditing ? (
          <Textarea
            value={question.content}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Forneça uma pergunta clara e específica"
            rows={3}
            className="resize-none"
          />
        ) : (
          <p className="text-sm">{question.content}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {question.content.length} caracteres
        </p>
      </div>

      {isEditing && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          aria-label="Excluir pergunta"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export const AgentQuestionsTab = ({
  questions,
  isEditing,
  onQuestionsChange,
  agentId,
  agentType,
}: AgentQuestionsTabProps) => {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      const newQuestions = arrayMove(questions, oldIndex, newIndex).map(
        (q, idx) => ({ ...q, order: idx + 1 })
      );
      onQuestionsChange(newQuestions);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newQuestions = arrayMove(questions, index, index - 1).map(
      (q, idx) => ({ ...q, order: idx + 1 })
    );
    onQuestionsChange(newQuestions);
  };

  const handleMoveDown = (index: number) => {
    if (index === questions.length - 1) return;
    const newQuestions = arrayMove(questions, index, index + 1).map(
      (q, idx) => ({ ...q, order: idx + 1 })
    );
    onQuestionsChange(newQuestions);
  };

  const handleQuestionChange = (id: string, content: string) => {
    onQuestionsChange(
      questions.map((q) => (q.id === id ? { ...q, content } : q))
    );
  };

  const handleAddQuestion = () => {
    const newQuestion: AgentQuestion = {
      id: `q-${Date.now()}`,
      order: questions.length + 1,
      content: "",
    };
    onQuestionsChange([...questions, newQuestion]);
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return;
    const filtered = questions
      .filter((q) => q.id !== pendingDeleteId)
      .map((q, idx) => ({ ...q, order: idx + 1 }));
    onQuestionsChange(filtered);
    setPendingDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {agentType === "cultural" && agentId && (
        <ValuesQuestionsSyncBanner
          agentId={agentId}
          currentQuestionCount={questions.length}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Perguntas da Entrevista</h3>
            <span className="text-lg text-muted-foreground">{questions.length}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Defina a sequência de perguntas que serão feitas durante a entrevista
          </p>
        </div>
        {isEditing && (
          <Button onClick={handleAddQuestion} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Pergunta
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={questions.map((q) => q.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {questions.map((question, index) => (
              <SortableQuestion
                key={question.id}
                question={question}
                index={index}
                total={questions.length}
                isEditing={isEditing}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
                onChange={(content) => handleQuestionChange(question.id, content)}
                onDelete={() => setPendingDeleteId(question.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pergunta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a pergunta da lista. Lembre-se de clicar em{" "}
              <strong>Salvar</strong> para persistir a alteração.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
