import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Plus } from 'lucide-react';
import type { PerspectiveConfig } from '@/types/indicators.types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PerspectiveCardProps {
  perspective: PerspectiveConfig;
  indicators: string[];
  selectedIndicators: string[];
  maxSelection: number;
  onToggleIndicator: (indicator: string) => void;
}

export function PerspectiveCard({
  perspective,
  indicators,
  selectedIndicators,
  maxSelection,
  onToggleIndicator
}: PerspectiveCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [customIndicator, setCustomIndicator] = useState('');
  const isLimitReached = selectedIndicators.length >= maxSelection;

  // Separar indicadores do catálogo e personalizados
  const customIndicators = selectedIndicators.filter(i => i.startsWith('✨'));
  
  const handleAddCustom = () => {
    const trimmed = customIndicator.trim();
    if (!trimmed) {
      toast.error('Digite o nome do indicador');
      return;
    }
    if (selectedIndicators.length >= maxSelection) {
      toast.error(`Limite de ${maxSelection} indicadores atingido`);
      return;
    }
    
    const customValue = `✨ ${trimmed}`;
    if (selectedIndicators.includes(customValue)) {
      toast.error('Este indicador já foi adicionado');
      return;
    }
    
    onToggleIndicator(customValue);
    setCustomIndicator('');
    toast.success('Indicador personalizado adicionado!');
  };

  return (
    <div className={cn(
      "rounded-xl border-2 overflow-hidden transition-all duration-300",
      perspective.borderColor,
      perspective.bgColor
    )}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full p-4 flex items-center justify-between",
          "hover:bg-black/5 transition-colors"
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{perspective.icon}</span>
          <div className="text-left">
            <h3 className={cn("font-semibold", perspective.color)}>
              {perspective.label}
            </h3>
            <p className="text-xs text-muted-foreground">
              Selecionados: <span className={cn(
                "font-bold",
                selectedIndicators.length > 0 ? "text-primary" : ""
              )}>{selectedIndicators.length}</span> / {maxSelection}
            </p>
          </div>
        </div>
        {selectedIndicators.length === maxSelection && (
          <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
            <Check className="w-4 h-4" />
            Completo
          </div>
        )}
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {/* Indicadores do catálogo */}
          <div className="flex flex-wrap gap-2">
            <TooltipProvider>
              {indicators.map((indicator) => {
                const isSelected = selectedIndicators.includes(indicator);
                const isDisabled = !isSelected && isLimitReached;

                return (
                  <Tooltip key={indicator}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => !isDisabled && onToggleIndicator(indicator)}
                        disabled={isDisabled}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                          "border",
                          isSelected
                            ? cn(
                                "bg-primary text-primary-foreground border-primary",
                                "shadow-md scale-[1.02]"
                              )
                            : isDisabled
                            ? "bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-50"
                            : cn(
                                "bg-background text-foreground border-border",
                                "hover:border-primary hover:shadow-sm hover:scale-[1.01]"
                              )
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                        {indicator}
                      </button>
                    </TooltipTrigger>
                    {isDisabled && (
                      <TooltipContent>
                        <p>Limite atingido (máximo {maxSelection})</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>

          {/* Indicadores personalizados já adicionados */}
          {customIndicators.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {customIndicators.map((indicator) => (
                <button
                  key={indicator}
                  onClick={() => onToggleIndicator(indicator)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    "border bg-primary text-primary-foreground border-primary",
                    "shadow-md scale-[1.02]"
                  )}
                >
                  <Check className="w-3 h-3 inline mr-1" />
                  {indicator}
                </button>
              ))}
            </div>
          )}

          {/* Campo para adicionar indicador personalizado */}
          <div className="flex gap-2 pt-2 border-t border-border/50">
            <Input
              placeholder="Criar indicador personalizado..."
              value={customIndicator}
              onChange={(e) => setCustomIndicator(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              className="flex-1 h-9 text-sm"
              disabled={isLimitReached}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddCustom}
              disabled={isLimitReached || !customIndicator.trim()}
              className="h-9 px-3"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {isLimitReached && (
            <p className="text-xs text-muted-foreground">
              Limite de {maxSelection} indicadores atingido. Remova um para adicionar outro.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
