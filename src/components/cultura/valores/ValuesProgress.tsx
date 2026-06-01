import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ValuesProgressProps {
  stage: number;
  totalStages?: number;
  onStageClick?: (stage: number) => void;
}

export function ValuesProgress({ stage, totalStages = 9, onStageClick }: ValuesProgressProps) {
  const steps = [
    { number: 1, label: "20 Valores" },
    { number: 2, label: "10 Valores" },
    { number: 3, label: "5 Valores" },
    { number: 4, label: "Perguntas" },
    { number: 5, label: "Validação" },
    { number: 6, label: "Check Final" },
    { number: 7, label: "Aprovação" },
    { number: 8, label: "Comportamentos" },
    { number: 9, label: "Resumo" }
  ];

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {steps.map((step, index) => {
          const isCompleted = stage > step.number;
          const isCurrent = stage === step.number;
          const isClickable = (isCompleted || isCurrent) && !!onStageClick;

          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStageClick(step.number)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm border-2 transition-all",
                    isCurrent
                      ? "bg-primary text-primary-foreground border-primary"
                      : isCompleted
                        ? "bg-primary/10 text-primary border-primary"
                        : "bg-background text-muted-foreground border-muted",
                    isClickable
                      ? "cursor-pointer hover:scale-110 hover:shadow-md active:scale-95"
                      : "cursor-default"
                  )}
                  title={isClickable ? `Ir para: ${step.label}` : undefined}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step.number}
                </button>
                <span
                  className={cn(
                    "text-xs mt-2 text-center whitespace-nowrap",
                    stage === step.number ? "text-primary font-medium" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 transition-all",
                    stage > step.number ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
