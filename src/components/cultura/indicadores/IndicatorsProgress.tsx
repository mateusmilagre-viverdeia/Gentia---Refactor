import { cn } from '@/lib/utils';

interface IndicatorsProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function IndicatorsProgress({ currentStep, totalSteps }: IndicatorsProgressProps) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Progresso</span>
        <span className="font-medium text-foreground">{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full bg-primary transition-all duration-500 ease-out rounded-full"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Etapa {currentStep} de {totalSteps}</span>
        {currentStep === 1 && <span>🎯 Selecione indicadores por perspectiva</span>}
        {currentStep === 2 && <span>🏆 Escolha seus KPIs principais</span>}
        {currentStep === 3 && <span>✨ Concluído!</span>}
      </div>
    </div>
  );
}
