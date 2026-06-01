import { EVENT_PILLARS } from "@/types/event.types";

interface EventProgressProps {
  currentStage: number;
  onStageClick?: (stage: number) => void;
}

export function EventProgress({ currentStage, onStageClick }: EventProgressProps) {
  // Stage 0 = format selection, 1-9 = pillars, 10 = review, 11 = summary
  const totalSteps = 11;
  const progressPercentage = Math.min((currentStage / totalSteps) * 100, 100);

  const getStepLabel = (stage: number) => {
    if (stage === 0) return "Formato";
    if (stage >= 1 && stage <= 9) {
      const pillar = EVENT_PILLARS.find(p => p.number === stage);
      return pillar ? pillar.title : `Pilar ${stage}`;
    }
    if (stage === 10) return "Revisão";
    if (stage === 11) return "Sumário";
    return "";
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          {currentStage === 0 ? "Início" : 
           currentStage <= 9 ? `Pilar ${currentStage} de 9` : 
           currentStage === 10 ? "Revisão" : "Finalizado"}
        </span>
        <span className="text-sm text-muted-foreground">
          {getStepLabel(currentStage)}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between mt-3">
        {[...Array(11)].map((_, index) => {
          const stepNumber = index + 1;
          const isActive = currentStage >= stepNumber;
          const isCurrent = currentStage === stepNumber;
          const isCompleted = currentStage > stepNumber;
          const isClickable = (isCompleted || isCurrent) && !!onStageClick;
          
          return (
            <div 
              key={index} 
              className="flex flex-col items-center"
            >
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStageClick(stepNumber)}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  isCurrent 
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' 
                    : isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                } ${
                  isClickable
                    ? 'cursor-pointer hover:scale-110 hover:shadow-md active:scale-95'
                    : 'cursor-default'
                }`}
                title={isClickable ? `Ir para: ${getStepLabel(stepNumber)}` : undefined}
              >
                {stepNumber <= 9 ? stepNumber : stepNumber === 10 ? '✓' : '★'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
