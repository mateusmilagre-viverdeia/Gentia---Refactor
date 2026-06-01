import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ProjectsProgressProps {
  stage: number;
  onStageClick?: (stage: number) => void;
}

const STEPS = [
  { id: 1, label: "Seleção" },
  { id: 2, label: "Priorização" },
  { id: 3, label: "Validação IA" },
  { id: 4, label: "Detalhamento" },
  { id: 5, label: "Resumo" }
];

export function ProjectsProgress({ stage, onStageClick }: ProjectsProgressProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {STEPS.map((step, index) => {
        const isCompleted = stage > step.id;
        const isCurrent = stage === step.id;
        const isClickable = (isCompleted || isCurrent) && !!onStageClick;
        
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStageClick(step.id)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all",
                  isCompleted && "bg-primary text-primary-foreground border-primary",
                  isCurrent && "bg-primary text-primary-foreground border-primary ring-2 ring-primary/30",
                  !isCompleted && !isCurrent && "bg-background text-muted-foreground border-muted",
                  isClickable
                    ? "cursor-pointer hover:scale-110 hover:shadow-md active:scale-95"
                    : "cursor-default"
                )}
                title={isClickable ? `Ir para: ${step.label}` : undefined}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </button>
              <span
                className={cn(
                  "text-xs mt-1 whitespace-nowrap",
                  (isCompleted || isCurrent) ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-12 h-0.5 mx-2 mb-5",
                  stage > step.id ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
