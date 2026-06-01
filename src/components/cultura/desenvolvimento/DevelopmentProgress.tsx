import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface DevelopmentProgressProps {
  currentStage: number;
  onStageClick?: (stage: number) => void;
}

const STEPS = [
  { stage: 1, label: '20 Rituais' },
  { stage: 2, label: '10 Rituais' },
  { stage: 3, label: '5 Rituais' },
  { stage: 4, label: 'Aprovação' },
  { stage: 5, label: 'Resumo' },
];

export function DevelopmentProgress({ currentStage, onStageClick }: DevelopmentProgressProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((step, index) => {
        const isCompleted = currentStage > step.stage;
        const isCurrent = currentStage === step.stage;
        const isClickable = (isCompleted || isCurrent) && !!onStageClick;

        return (
          <div key={step.stage} className="flex items-center">
            <div className="flex flex-col items-center">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStageClick(step.stage)}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                      : 'bg-muted text-muted-foreground',
                  isClickable
                    ? 'cursor-pointer hover:scale-110 hover:shadow-md active:scale-95'
                    : 'cursor-default'
                )}
                title={isClickable ? `Ir para: ${step.label}` : undefined}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : step.stage}
              </button>
              <span
                className={cn(
                  'text-xs mt-1 text-center',
                  currentStage >= step.stage
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-12 mx-2',
                  currentStage > step.stage ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
