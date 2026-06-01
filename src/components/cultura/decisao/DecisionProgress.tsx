import { Check } from "lucide-react";
import { DECISION_QUESTIONS } from "@/types/decision.types";

interface DecisionProgressProps {
  currentStage: number;
  onStageClick?: (stage: number) => void;
}

export function DecisionProgress({ currentStage, onStageClick }: DecisionProgressProps) {
  const totalSteps = 9; // 7 questions + review + summary
  
  const getStepLabel = (step: number) => {
    if (step <= 7) return DECISION_QUESTIONS[step - 1]?.shortTitle || `${step}`;
    if (step === 8) return "Revisão";
    return "Sumário";
  };

  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">Progresso</span>
        <span className="text-sm font-medium">
          {currentStage <= 7 ? `${currentStage}/7 perguntas` : currentStage === 8 ? "Revisão" : "Concluído"}
        </span>
      </div>
      
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-6">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${(currentStage / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isComplete = step < currentStage;
          const isCurrent = step === currentStage;
          const isClickable = (isComplete || isCurrent) && !!onStageClick;
          
          return (
            <div key={step} className="flex flex-col items-center">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStageClick(step)}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                  transition-all duration-300
                  ${isComplete 
                    ? 'bg-primary text-primary-foreground' 
                    : isCurrent 
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' 
                      : 'bg-muted text-muted-foreground'
                  }
                  ${isClickable
                    ? 'cursor-pointer hover:scale-110 hover:shadow-md active:scale-95'
                    : 'cursor-default'
                  }
                `}
                title={isClickable ? `Ir para: ${getStepLabel(step)}` : undefined}
              >
                {isComplete ? <Check className="w-4 h-4" /> : step}
              </button>
              <span className={`
                text-[10px] mt-1 hidden sm:block
                ${isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'}
              `}>
                {getStepLabel(step)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
