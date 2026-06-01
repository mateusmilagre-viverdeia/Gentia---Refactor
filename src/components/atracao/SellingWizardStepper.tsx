import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS } from "@/types/selling-company.types";

interface SellingWizardStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function SellingWizardStepper({ currentStep, onStepClick }: SellingWizardStepperProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => onStepClick?.(step.id)}
                  disabled={!onStepClick || step.id > currentStep}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground",
                    onStepClick && step.id <= currentStep && "cursor-pointer hover:opacity-80"
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : step.id}
                </button>
                <div className="mt-2 text-center">
                  <p className={cn(
                    "text-xs font-medium",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>
              
              {index < WIZARD_STEPS.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-2",
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
