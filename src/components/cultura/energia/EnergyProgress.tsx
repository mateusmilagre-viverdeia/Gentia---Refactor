import { Check } from 'lucide-react';

interface EnergyProgressProps {
  currentStage: number;
  onStageClick?: (stage: number) => void;
}

const stages = [
  { id: 1, label: '20' },
  { id: 2, label: '10' },
  { id: 3, label: '5' },
  { id: 4, label: 'Aprovar' },
  { id: 5, label: 'Resumo' },
];

export function EnergyProgress({ currentStage, onStageClick }: EnergyProgressProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {stages.map((stage, index) => {
        const isCompleted = currentStage > stage.id;
        const isCurrent = currentStage === stage.id;
        const isClickable = (isCompleted || isCurrent) && !!onStageClick;
        
        return (
          <div key={stage.id} className="flex items-center">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStageClick(stage.id)}
              className={`
                flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all
                ${isCompleted 
                  ? 'bg-primary text-primary-foreground' 
                  : isCurrent 
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' 
                    : 'bg-muted text-muted-foreground'
                }
                ${isClickable
                  ? 'cursor-pointer hover:scale-110 hover:shadow-md active:scale-95'
                  : 'cursor-default'
                }
              `}
              title={isClickable ? `Voltar para: ${stage.label}` : undefined}
            >
              {isCompleted ? <Check className="w-4 h-4" /> : stage.label}
            </button>
            {index < stages.length - 1 && (
              <div className={`w-8 h-0.5 mx-1 ${isCompleted ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
