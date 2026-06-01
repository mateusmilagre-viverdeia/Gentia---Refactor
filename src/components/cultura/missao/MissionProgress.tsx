import { Button } from "@/components/ui/button";

interface MissionProgressProps {
  currentQuestion: number;
  answeredQuestions: Set<number>;
  onQuestionClick: (question: number) => void;
  totalQuestions?: number;
}

export function MissionProgress({ 
  currentQuestion, 
  answeredQuestions, 
  onQuestionClick,
  totalQuestions = 8 
}: MissionProgressProps) {
  // Ajustar grid baseado no total de perguntas
  const gridCols = totalQuestions <= 8 ? 'grid-cols-8' : 'grid-cols-10';
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Progresso</h3>
        <span className="text-sm text-muted-foreground">
          {answeredQuestions.size} de {totalQuestions} respondidas
        </span>
      </div>
      
      <div className={`grid ${gridCols} gap-2`}>
        {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((questionNumber) => {
          const isAnswered = answeredQuestions.has(questionNumber);
          const isCurrent = currentQuestion === questionNumber;
          const canNavigate = isAnswered || isCurrent;
          
          return (
            <Button
              key={questionNumber}
              variant={isCurrent ? "default" : isAnswered ? "secondary" : "outline"}
              size="sm"
              onClick={() => canNavigate && onQuestionClick(questionNumber)}
              disabled={!canNavigate}
              className={`aspect-square p-0 ${
                isCurrent ? "ring-2 ring-primary ring-offset-2" : ""
              }`}
            >
              {questionNumber}
            </Button>
          );
        })}
      </div>
      
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span>Atual</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-secondary" />
          <span>Respondida</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border border-border" />
          <span>Pendente</span>
        </div>
      </div>
    </div>
  );
}
