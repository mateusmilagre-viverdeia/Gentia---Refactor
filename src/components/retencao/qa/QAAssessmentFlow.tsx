import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { QAEventCard } from "./QAEventCard";
import { QAEventGroup, QAQuestion } from "@/types/qa.types";

interface QAAssessmentFlowProps {
  eventGroups: QAEventGroup[];
  onComplete: (responses: { question_id: string; score: number }[]) => void;
  isSubmitting: boolean;
}

export function QAAssessmentFlow({ eventGroups, onComplete, isSubmitting }: QAAssessmentFlowProps) {
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});

  const currentEvent = eventGroups[currentEventIndex];
  const progress = ((currentEventIndex + 1) / eventGroups.length) * 100;

  // Check if current event questions are all answered
  const isCurrentEventComplete = currentEvent?.questions.every(
    (q) => responses[q.id] !== undefined
  );

  // Check if all questions are answered
  const allQuestions = eventGroups.flatMap(g => g.questions);
  const isAllComplete = allQuestions.every(q => responses[q.id] !== undefined);

  const handleResponseChange = (questionId: string, score: number) => {
    setResponses(prev => ({ ...prev, [questionId]: score }));
  };

  const handleNext = () => {
    if (currentEventIndex < eventGroups.length - 1) {
      setCurrentEventIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentEventIndex > 0) {
      setCurrentEventIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = () => {
    const responseArray = Object.entries(responses).map(([question_id, score]) => ({
      question_id,
      score
    }));
    onComplete(responseArray);
  };

  if (!currentEvent) {
    return <div>Carregando perguntas...</div>;
  }

  const isLastEvent = currentEventIndex === eventGroups.length - 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Evento {currentEventIndex + 1} de {eventGroups.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}% concluído
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Event Card */}
      <QAEventCard
        eventNumber={currentEvent.eventNumber}
        eventDescription={currentEvent.eventDescription}
        questions={currentEvent.questions}
        responses={responses}
        onResponseChange={handleResponseChange}
      />

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentEventIndex === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Anterior
        </Button>

        {isLastEvent ? (
          <Button
            onClick={handleSubmit}
            disabled={!isAllComplete || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculando...
              </>
            ) : (
              'Concluir Teste'
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!isCurrentEventComplete}
          >
            Próximo
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Event Navigation Dots */}
      <div className="flex justify-center gap-1.5 pt-4">
        {eventGroups.map((_, index) => {
          const eventQuestions = eventGroups[index].questions;
          const isComplete = eventQuestions.every(q => responses[q.id] !== undefined);
          
          return (
            <button
              key={index}
              onClick={() => setCurrentEventIndex(index)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                index === currentEventIndex
                  ? 'bg-primary'
                  : isComplete
                  ? 'bg-green-500'
                  : 'bg-muted-foreground/30'
              }`}
              aria-label={`Ir para evento ${index + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
}
