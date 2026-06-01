import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
import { QuestionItem } from "./QuestionItem";
import type { SurveyQuestion, QuestionType } from "@/types/survey.types";

interface SurveyQuestionEditorProps {
  questions: SurveyQuestion[];
  onChange: (questions: SurveyQuestion[]) => void;
}

function SortableQuestionItem({
  question,
  index,
  onChange,
  onDelete,
}: {
  question: SurveyQuestion;
  index: number;
  onChange: (q: SurveyQuestion) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: question.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <QuestionItem
        question={question}
        index={index}
        onChange={onChange}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function SurveyQuestionEditor({ questions, onChange }: SurveyQuestionEditorProps) {
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
      const newQuestions = arrayMove(questions, oldIndex, newIndex).map((q, idx) => ({
        ...q,
        position: idx + 1,
      }));
      onChange(newQuestions);
    }
  };

  const addQuestion = () => {
    const newQuestion: SurveyQuestion = {
      id: `temp-${Date.now()}`,
      survey_id: "",
      question_text: "",
      question_type: "single_choice" as QuestionType,
      options: ['Opção 1', 'Opção 2'],
      required: true,
      position: questions.length + 1,
      created_at: new Date().toISOString(),
    };
    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, question: SurveyQuestion) => {
    const newQuestions = [...questions];
    newQuestions[index] = question;
    onChange(newQuestions);
  };

  const deleteQuestion = (index: number) => {
    const newQuestions = questions
      .filter((_, i) => i !== index)
      .map((q, idx) => ({ ...q, position: idx + 1 }));
    onChange(newQuestions);
  };

  return (
    <div className="space-y-4">
      {questions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhuma pergunta adicionada</p>
          <p className="text-sm">Clique em "Adicionar Pergunta" para começar</p>
        </div>
      ) : (
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
                <SortableQuestionItem
                  key={question.id}
                  question={question}
                  index={index}
                  onChange={(q) => updateQuestion(index, q)}
                  onDelete={() => deleteQuestion(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Button variant="outline" onClick={addQuestion} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Pergunta
      </Button>
    </div>
  );
}
