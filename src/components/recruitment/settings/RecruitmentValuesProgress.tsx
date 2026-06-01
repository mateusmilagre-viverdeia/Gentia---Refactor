import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface RecruitmentValuesProgressProps {
  /** Stage do banco (1..9, sendo 8 pulado) */
  stage: number;
  /** Recebe a stage do banco para a qual navegar */
  onStageClick?: (stage: number) => void;
}

// Mapeia passos visuais (sem "Comportamentos") -> stage do banco
const steps = [
  { number: 1, label: "20 Valores", dbStage: 1 },
  { number: 2, label: "10 Valores", dbStage: 2 },
  { number: 3, label: "5 Valores", dbStage: 3 },
  { number: 4, label: "Perguntas", dbStage: 4 },
  { number: 5, label: "Validação", dbStage: 5 },
  { number: 6, label: "Check Final", dbStage: 6 },
  { number: 7, label: "Aprovação", dbStage: 7 },
  { number: 8, label: "Resumo", dbStage: 9 },
];

export function RecruitmentValuesProgress({ stage, onStageClick }: RecruitmentValuesProgressProps) {
  // Stage 8 do banco é tratado como "Resumo" (visualmente)
  const visualStage = stage === 8 ? 8 : steps.find((s) => s.dbStage === stage)?.number ?? 1;

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {steps.map((step, index) => {
          const isCompleted = visualStage > step.number;
          const isCurrent = visualStage === step.number;
          const isClickable = (isCompleted || isCurrent) && !!onStageClick;

          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStageClick?.(step.dbStage)}
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
                    isCurrent ? "text-primary font-medium" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 transition-all",
                    visualStage > step.number ? "bg-primary" : "bg-muted"
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
