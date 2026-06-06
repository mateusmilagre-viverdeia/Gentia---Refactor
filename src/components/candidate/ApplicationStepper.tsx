import { cn } from "@/lib/utils";
import { Sparkles, Brain, Code, CheckCircle2, XCircle, Loader2, Shield } from "lucide-react";

export type StepStatus = "completed" | "active" | "locked" | "rejected" | "evaluating";

export interface StepperStep {
  id: string;
  type: "screening" | "cultural" | "disc" | "technical" | "completed";
  label: string;
  status: StepStatus;
}

const STEP_ICONS: Record<string, React.ElementType> = {
  screening: Shield,
  cultural: Sparkles,
  disc: Brain,
  technical: Code,
  completed: CheckCircle2,
};

const STEP_LABELS: Record<string, string> = {
  screening: "Triagem",
  cultural: "Fit Cultural",
  disc: "Fit Comportamental",
  technical: "Fit Técnico",
  completed: "Concluído",
};


export function buildStepperSteps(
  workflowSteps: Array<{ step_type: string; position?: number }>,
  completedTypes: Set<string>
): StepperStep[] {
  // Respeita a ordem real do workflow (position do banco), não uma ordem fixa por tipo.
  // Isso garante que qualquer combinação/ordem de etapas (Técnico primeiro, DISC primeiro etc.)
  // funcione corretamente. Etapas sem UI nesta página (ex.: screening) são filtradas mas
  // a ordem relativa entre cultural/disc/technical é preservada conforme position.
  const ordered = [...workflowSteps]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .filter((s) => ["screening", "cultural", "disc", "technical"].includes(s.step_type));


  let foundActive = false;
  const steps: StepperStep[] = ordered.map((s) => {
    const isCompleted = completedTypes.has(s.step_type);
    let status: StepStatus;
    if (isCompleted) {
      status = "completed";
    } else if (!foundActive) {
      status = "active";
      foundActive = true;
    } else {
      status = "locked";
    }
    return {
      id: s.step_type,
      type: s.step_type as StepperStep["type"],
      label: STEP_LABELS[s.step_type] || s.step_type,
      status,
    };
  });

  // Virtual final step
  const allDone = ordered.length > 0 && ordered.every((s) => completedTypes.has(s.step_type));
  steps.push({
    id: "completed",
    type: "completed",
    label: "Concluído",
    status: allDone ? "completed" : "locked",
  });

  return steps;
}

export function ApplicationStepper({ steps }: { steps: StepperStep[] }) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = STEP_ICONS[step.type] || CheckCircle2;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5 min-w-0">
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all shrink-0",
                    step.status === "completed" &&
                      "bg-green-500 border-green-500 text-white",
                    step.status === "active" &&
                      "bg-primary border-primary text-primary-foreground animate-pulse",
                    step.status === "evaluating" &&
                      "bg-amber-100 border-amber-500 text-amber-600 dark:bg-amber-900/30 dark:border-amber-500 dark:text-amber-400",
                    step.status === "locked" &&
                      "bg-muted border-border text-muted-foreground",
                    step.status === "rejected" &&
                      "bg-destructive/20 border-destructive/50 text-destructive"
                  )}
                >
                  {step.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : step.status === "rejected" ? (
                    <XCircle className="h-5 w-5" />
                  ) : step.status === "evaluating" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium text-center leading-tight max-w-[80px]",
                    step.status === "completed" && "text-green-600",
                    step.status === "active" && "text-primary",
                    step.status === "evaluating" && "text-amber-600",
                    step.status === "locked" && "text-muted-foreground",
                    step.status === "rejected" && "text-destructive"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 mx-2 mb-5">
                  <div
                    className={cn(
                      "h-0.5 w-full transition-colors",
                      step.status === "completed" ? "bg-green-500" : "bg-border"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
