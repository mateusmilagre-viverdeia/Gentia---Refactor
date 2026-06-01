import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { GripVertical, Trash2, Plus, X } from "lucide-react";
import type { SurveyQuestion, QuestionType } from "@/types/survey.types";
import { QUESTION_TYPE_LABELS } from "@/types/survey.types";

interface QuestionItemProps {
  question: SurveyQuestion;
  index: number;
  onChange: (question: SurveyQuestion) => void;
  onDelete: () => void;
  dragHandleProps?: any;
}

export function QuestionItem({
  question,
  index,
  onChange,
  onDelete,
  dragHandleProps,
}: QuestionItemProps) {
  // Parse options - they can be string[] or object with min/max/labels
  const getOptionsArray = (): string[] => {
    if (Array.isArray(question.options)) {
      return question.options as string[];
    }
    return [];
  };

  const [options, setOptions] = useState<string[]>(getOptionsArray());

  useEffect(() => {
    setOptions(getOptionsArray());
  }, [question.options]);

  const handleTypeChange = (type: QuestionType) => {
    let newOptions: any = question.options;
    if (type === 'single_choice' || type === 'multiple_choice') {
      newOptions = options.length ? options : ['Opção 1', 'Opção 2'];
    } else if (type === 'scale') {
      newOptions = { min: 1, max: 5, labels: { '1': 'Muito ruim', '5': 'Excelente' } };
    } else if (type === 'nps') {
      newOptions = { min: 0, max: 10 };
    } else {
      newOptions = null;
    }
    onChange({ ...question, question_type: type, options: newOptions });
  };

  const handleOptionChange = (idx: number, value: string) => {
    const newOptions = [...options];
    newOptions[idx] = value;
    setOptions(newOptions);
    onChange({ ...question, options: newOptions });
  };

  const addOption = () => {
    const newOptions = [...options, `Opção ${options.length + 1}`];
    setOptions(newOptions);
    onChange({ ...question, options: newOptions });
  };

  const removeOption = (idx: number) => {
    const newOptions = options.filter((_, i) => i !== idx);
    setOptions(newOptions);
    onChange({ ...question, options: newOptions });
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div {...dragHandleProps} className="cursor-grab mt-2">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Pergunta {index + 1}</Label>
              <Input
                value={question.question_text}
                onChange={(e) => onChange({ ...question, question_text: e.target.value })}
                placeholder="Digite a pergunta..."
                className="mt-1"
              />
            </div>

            <div className="w-40">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select
                value={question.question_type}
                onValueChange={(v) => handleTypeChange(v as QuestionType)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QUESTION_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Switch
                checked={question.required}
                onCheckedChange={(v) => onChange({ ...question, required: v })}
              />
              <span className="text-xs text-muted-foreground">Obrigatória</span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="text-destructive mt-5"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
            <div className="pl-4 space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border border-muted-foreground" />
                  <Input
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    className="flex-1"
                    placeholder={`Opção ${idx + 1}`}
                  />
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeOption(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={addOption}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar opção
              </Button>
            </div>
          )}

          {question.question_type === 'scale' && (
            <div className="pl-4 flex items-center gap-4 text-sm text-muted-foreground">
              <span>Escala de 1 a 5</span>
              <span className="text-xs">(1 = Muito ruim, 5 = Excelente)</span>
            </div>
          )}

          {question.question_type === 'nps' && (
            <div className="pl-4 flex items-center gap-4 text-sm text-muted-foreground">
              <span>Escala NPS de 0 a 10</span>
            </div>
          )}

          {question.question_type === 'text' && (
            <div className="pl-4 text-sm text-muted-foreground">
              Resposta de texto livre
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
