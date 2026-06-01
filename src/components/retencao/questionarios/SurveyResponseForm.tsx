import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Loader2, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import type { SurveyQuestion } from '@/types/survey.types';

interface Answer {
  questionId: string;
  text?: string;
  options?: string[];
  scale?: number;
}

interface SurveyResponseFormProps {
  questions: SurveyQuestion[];
  onSubmit: (answers: Answer[]) => Promise<void>;
  isSubmitting: boolean;
}

export function SurveyResponseForm({ questions, onSubmit, isSubmitting }: SurveyResponseFormProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentIndex === questions.length - 1;
  const isFirstQuestion = currentIndex === 0;

  const updateAnswer = (questionId: string, update: Partial<Answer>) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        questionId,
        ...prev[questionId],
        ...update,
      },
    }));
  };

  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstQuestion) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    const answersArray = questions.map((q) => answers[q.id] || { questionId: q.id });
    await onSubmit(answersArray);
  };

  const currentAnswer = answers[currentQuestion?.id];
  const isCurrentAnswered = currentAnswer && (
    currentAnswer.text ||
    (currentAnswer.options && currentAnswer.options.length > 0) ||
    currentAnswer.scale !== undefined
  );
  const isRequired = currentQuestion?.required;
  const canProceed = !isRequired || isCurrentAnswered;

  const renderQuestionInput = () => {
    if (!currentQuestion) return null;

    const questionOptions = currentQuestion.options as string[] | null;

    switch (currentQuestion.question_type) {
      case 'text':
        return (
          <Textarea
            placeholder="Digite sua resposta..."
            value={currentAnswer?.text || ''}
            onChange={(e) => updateAnswer(currentQuestion.id, { text: e.target.value })}
            className="min-h-[120px]"
          />
        );

      case 'single_choice':
        return (
          <RadioGroup
            value={currentAnswer?.options?.[0] || ''}
            onValueChange={(value) => updateAnswer(currentQuestion.id, { options: [value] })}
            className="space-y-3"
          >
            {questionOptions?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-3">
                <RadioGroupItem value={option} id={`option-${idx}`} />
                <Label htmlFor={`option-${idx}`} className="cursor-pointer flex-1">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'multiple_choice':
        const selectedOptions = currentAnswer?.options || [];
        return (
          <div className="space-y-3">
            {questionOptions?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-3">
                <Checkbox
                  id={`option-${idx}`}
                  checked={selectedOptions.includes(option)}
                  onCheckedChange={(checked) => {
                    const newOptions = checked
                      ? [...selectedOptions, option]
                      : selectedOptions.filter((o) => o !== option);
                    updateAnswer(currentQuestion.id, { options: newOptions });
                  }}
                />
                <Label htmlFor={`option-${idx}`} className="cursor-pointer flex-1">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case 'scale':
        const scaleMax = 5;
        return (
          <div className="flex justify-center gap-2 flex-wrap">
            {Array.from({ length: scaleMax }, (_, i) => i + 1).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => updateAnswer(currentQuestion.id, { scale: value })}
                className={cn(
                  'w-12 h-12 rounded-lg border-2 font-semibold transition-all',
                  currentAnswer?.scale === value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {value}
              </button>
            ))}
          </div>
        );

      case 'nps':
        return (
          <div className="space-y-4">
            <div className="flex justify-center gap-1 flex-wrap">
              {Array.from({ length: 11 }, (_, i) => i).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateAnswer(currentQuestion.id, { scale: value })}
                  className={cn(
                    'w-10 h-10 rounded-lg border-2 font-semibold text-sm transition-all',
                    currentAnswer?.scale === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : value <= 6
                        ? 'border-red-200 hover:border-red-400 dark:border-red-900 dark:hover:border-red-700'
                        : value <= 8
                          ? 'border-yellow-200 hover:border-yellow-400 dark:border-yellow-900 dark:hover:border-yellow-700'
                          : 'border-green-200 hover:border-green-400 dark:border-green-900 dark:hover:border-green-700'
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground px-2">
              <span>Nada provável</span>
              <span>Muito provável</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Pergunta {currentIndex + 1} de {questions.length}</span>
          <span>{Math.round(progress)}% concluído</span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <CardTitle className="text-lg mb-1">
            {currentQuestion?.question_text}
            {currentQuestion?.required && <span className="text-destructive ml-1">*</span>}
          </CardTitle>
        </div>

        <div className="py-4">
          {renderQuestionInput()}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={isFirstQuestion || isSubmitting}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        {isLastQuestion ? (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Respostas
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!canProceed}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
