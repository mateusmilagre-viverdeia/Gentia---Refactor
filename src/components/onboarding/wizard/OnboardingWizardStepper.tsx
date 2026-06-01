import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WizardStep {
  id: number;
  title: string;
  description: string;
}

export const ONBOARDING_WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'Colaborador', description: 'Informações básicas' },
  { id: 2, title: 'Template', description: 'Selecionar modelo' },
  { id: 3, title: 'Fases', description: 'Personalizar etapas' },
  { id: 4, title: 'Responsáveis', description: 'Definir equipe' },
  { id: 5, title: 'Revisão', description: 'Confirmar dados' },
];

interface OnboardingWizardStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function OnboardingWizardStepper({ currentStep, onStepClick }: OnboardingWizardStepperProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {ONBOARDING_WIZARD_STEPS.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isClickable = onStepClick && (isCompleted || isCurrent);

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <button
                  onClick={() => isClickable && onStepClick(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
                    isClickable && 'cursor-pointer hover:opacity-80'
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : step.id}
                </button>
                <div className="mt-2 text-center">
                  <p className={cn(
                    'text-sm font-medium',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < ONBOARDING_WIZARD_STEPS.length - 1 && (
                <div className={cn(
                  'h-0.5 flex-1 mx-2',
                  isCompleted ? 'bg-primary' : 'bg-muted'
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
