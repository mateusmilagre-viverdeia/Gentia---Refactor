interface RitualProgressProps {
  currentStage: number;
  highestStageReached?: number;
  onStageClick?: (stage: number) => void;
}

const PROGRESS_STEPS = [
  { stage: 1, label: 'Rituais de Gestão', icon: '📋' },
  { stage: 2, label: 'IA', icon: '🤖' },
  { stage: 3, label: 'Artefatos', icon: '🏛️' },
  { stage: 4, label: 'Ideias', icon: '💡' },
  { stage: 5, label: 'Valores', icon: '💎' },
  { stage: 6, label: 'Análise Final', icon: '🧠' },
  { stage: 7, label: 'Revisão Final', icon: '✅' },
];

export function RitualProgress({ currentStage, highestStageReached, onStageClick }: RitualProgressProps) {
  const maxReached = highestStageReached ?? currentStage;

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center justify-between min-w-[600px]">
        {PROGRESS_STEPS.map((step, index) => {
          const isActive = currentStage === step.stage;
          const isCompleted = currentStage > step.stage;
          const isReachable = step.stage <= maxReached;
          const isClickable = isReachable && !!onStageClick;

          return (
            <div key={step.stage} className="flex items-center">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStageClick(step.stage)}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm transition-transform
                    ${isActive ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : ""}
                    ${isCompleted ? "bg-primary text-primary-foreground" : ""}
                    ${!isActive && !isCompleted && isReachable ? "bg-primary/20 text-primary" : ""}
                    ${!isActive && !isCompleted && !isReachable ? "bg-muted text-muted-foreground" : ""}
                    ${isClickable ? "cursor-pointer hover:scale-110" : "cursor-default"}
                  `}
                >
                  {step.icon}
                </button>
                <span
                  className={`text-[9px] mt-1 text-center max-w-[60px] leading-tight ${
                    isActive ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < PROGRESS_STEPS.length - 1 && (
                <div
                  className={`h-0.5 w-6 md:w-10 mx-0.5 ${
                    isCompleted ? "bg-primary" : isReachable ? "bg-primary/30" : "bg-muted"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
