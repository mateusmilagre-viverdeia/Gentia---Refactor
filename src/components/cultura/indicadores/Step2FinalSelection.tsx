import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { IndicatorsProgress } from './IndicatorsProgress';
import { PERSPECTIVES, type Perspective } from '@/types/indicators.types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Step2FinalSelectionProps {
  allIndicators: string[];
  selectedStep1: Record<Perspective, string[]>;
  onBack: () => void;
  onComplete: (finalSelection: string[]) => Promise<void>;
}

export function Step2FinalSelection({
  allIndicators,
  selectedStep1,
  onBack,
  onComplete
}: Step2FinalSelectionProps) {
  const [finalSelection, setFinalSelection] = useState<string[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const minSelection = 3;
  const maxSelection = 7;

  const handleToggle = (indicator: string) => {
    if (finalSelection.includes(indicator)) {
      setFinalSelection(prev => prev.filter(i => i !== indicator));
    } else {
      if (finalSelection.length >= maxSelection) {
        toast.error(`Máximo ${maxSelection} indicadores!`);
        return;
      }
      setFinalSelection(prev => [...prev, indicator]);
      if (finalSelection.length + 1 === minSelection) {
        toast.success('🎯 Faltam poucos! Continue selecionando.');
      }
    }
  };

  const getPerspectiveForIndicator = (indicator: string): Perspective | null => {
    for (const p of PERSPECTIVES) {
      if (selectedStep1[p.key]?.includes(indicator)) {
        return p.key;
      }
    }
    return null;
  };

  const getPerspectiveConfig = (perspective: Perspective) => {
    return PERSPECTIVES.find(p => p.key === perspective);
  };

  const handleComplete = async () => {
    if (finalSelection.length < minSelection || finalSelection.length > maxSelection) {
      toast.error(`Selecione entre ${minSelection} e ${maxSelection} indicadores.`);
      return;
    }

    setIsCompleting(true);
    try {
      await onComplete(finalSelection);
      setShowSuccess(true);
    } catch (error) {
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setIsCompleting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="relative">
          <div className="absolute inset-0 animate-ping">
            <Sparkles className="w-16 h-16 text-primary/30" />
          </div>
          <Sparkles className="w-16 h-16 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-center text-foreground">
          ✨ Parabéns!
        </h2>
        <p className="text-center text-muted-foreground max-w-md">
          Você definiu seus <strong>{finalSelection.length} Indicadores Estratégicos de Sucesso!</strong>
        </p>
        <div className="flex flex-wrap gap-2 justify-center max-w-lg">
          {finalSelection.map((indicator) => {
            const perspective = getPerspectiveForIndicator(indicator);
            const config = perspective ? getPerspectiveConfig(perspective) : null;
            return (
              <span
                key={indicator}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium",
                  config?.bgColor,
                  config?.color,
                  "border",
                  config?.borderColor
                )}
              >
                {config?.icon} {indicator}
              </span>
            );
          })}
        </div>
        <Button onClick={onBack} variant="outline" className="mt-4">
          Voltar ao início
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <IndicatorsProgress currentStep={2} totalSteps={2} />

      <div>
        <h2 className="text-xl font-semibold text-foreground">
          🎯 Seus Indicadores Estratégicos
        </h2>
        <p className="text-sm text-muted-foreground">
          Selecione de {minSelection} a {maxSelection} indicadores principais para seus KPIs estratégicos
        </p>
      </div>

      <div className="p-4 rounded-lg bg-muted/50 border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Selecionados</span>
          <span className={cn(
            "text-lg font-bold",
            finalSelection.length >= minSelection && finalSelection.length <= maxSelection
              ? "text-green-600"
              : finalSelection.length > maxSelection
              ? "text-destructive"
              : "text-primary"
          )}>
            {finalSelection.length} / {maxSelection}
          </span>
        </div>
        {finalSelection.length < minSelection && (
          <p className="text-xs text-muted-foreground mt-1">
            Mínimo {minSelection} indicadores necessários
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {allIndicators.map((indicator) => {
          const perspective = getPerspectiveForIndicator(indicator);
          const config = perspective ? getPerspectiveConfig(perspective) : null;
          const isSelected = finalSelection.includes(indicator);

          return (
            <button
              key={indicator}
              onClick={() => handleToggle(indicator)}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all duration-200",
                "hover:shadow-md hover:scale-[1.01]",
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : cn("border-border bg-background", config?.bgColor && `hover:${config.bgColor}`)
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{config?.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{indicator}</p>
                  <p className={cn("text-xs mt-0.5", config?.color)}>
                    {config?.label}
                  </p>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <Button
          onClick={handleComplete}
          disabled={finalSelection.length < minSelection || finalSelection.length > maxSelection || isCompleting}
          className="gap-2"
        >
          {isCompleting ? 'Salvando...' : 'Concluir e Salvar'}
          <Sparkles className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
