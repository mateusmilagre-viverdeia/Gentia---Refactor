import { Progress } from '@/components/ui/progress';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValuesQuestionsProgressProps {
  currentStage: number;
  totalValueStages: number;
  currentValueIndex?: number;
  maxReachedStage?: number;
  onStageClick?: (stage: number) => void;
}

export function ValuesQuestionsProgress({
  currentStage,
  totalValueStages,
  currentValueIndex,
  maxReachedStage,
  onStageClick,
}: ValuesQuestionsProgressProps) {
  const stages = [
    { label: 'Valores', stage: 0 },
    { label: 'Iniciais', stage: 1 },
    { label: 'Coringas I', stage: 2 },
    { label: 'Por Valor', stage: 3 },
    { label: 'Coringas F', stage: 4 },
    { label: 'Revisão', stage: 5 },
    { label: 'Sumário', stage: 6 },
  ];

  const totalSteps = 7;
  const progressPercent = Math.min((currentStage / (totalSteps - 1)) * 100, 100);
  const reached = Math.max(maxReachedStage ?? currentStage, currentStage);

  return (
    <div className="mb-8">
      <Progress value={progressPercent} className="h-2 mb-4" />

      <div className="flex justify-between items-start">
        {stages.map((s, index) => {
          const isCompleted = currentStage > s.stage;
          const isCurrent = currentStage === s.stage;
          const isClickable = !!onStageClick && s.stage <= reached && !isCurrent;

          return (
            <div key={s.stage} className="flex flex-col items-center gap-1">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStageClick?.(s.stage)}
                title={isClickable ? `Ir para: ${s.label}` : undefined}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                      : 'bg-muted text-muted-foreground',
                  isClickable
                    ? 'cursor-pointer hover:scale-110 hover:shadow-md active:scale-95'
                    : 'cursor-default'
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </button>
              <span className={`text-xs ${isCurrent ? 'font-semibold' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
              {s.stage === 3 && currentStage === 3 && totalValueStages > 0 && (
                <span className="text-xs text-muted-foreground">
                  {(currentValueIndex || 0) + 1}/{totalValueStages}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
