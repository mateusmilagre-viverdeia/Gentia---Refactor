import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SalaryRangeIndicatorProps {
  currentSalary: number;
  minimum: number;
  midpoint: number;
  maximum: number;
  showLabels?: boolean;
}

export function SalaryRangeIndicator({
  currentSalary,
  minimum,
  midpoint,
  maximum,
  showLabels = false,
}: SalaryRangeIndicatorProps) {
  const { position, status, color } = useMemo(() => {
    // Calculate position as percentage (0-100)
    let pos = ((currentSalary - minimum) / (maximum - minimum)) * 100;
    pos = Math.max(0, Math.min(100, pos));

    // Determine status and color
    let st: 'below' | 'entry' | 'developing' | 'ready' | 'exceeding' | 'above';
    let cl: string;

    if (currentSalary < minimum) {
      st = 'below';
      cl = 'bg-red-500';
    } else if (pos < 25) {
      st = 'entry';
      cl = 'bg-blue-500';
    } else if (pos < 50) {
      st = 'developing';
      cl = 'bg-amber-500';
    } else if (pos < 75) {
      st = 'ready';
      cl = 'bg-green-500';
    } else if (currentSalary <= maximum) {
      st = 'exceeding';
      cl = 'bg-purple-500';
    } else {
      st = 'above';
      cl = 'bg-red-500';
    }

    return { position: pos, status: st, color: cl };
  }, [currentSalary, minimum, maximum]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'below': return 'Abaixo da faixa';
      case 'entry': return 'Entrada (0-25%)';
      case 'developing': return 'Desenvolvimento (25-50%)';
      case 'ready': return 'Pronto (50-75%)';
      case 'exceeding': return 'Acima (75-100%)';
      case 'above': return 'Acima da faixa';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-1">
            {/* Progress bar */}
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              {/* Segments */}
              <div className="absolute inset-0 flex">
                <div className="w-1/4 border-r border-background/20" />
                <div className="w-1/4 border-r border-background/20" />
                <div className="w-1/4 border-r border-background/20" />
                <div className="w-1/4" />
              </div>
              
              {/* Current position indicator */}
              <div
                className={`absolute top-0 h-full w-1 ${color} transition-all`}
                style={{ left: `${Math.min(100, Math.max(0, position))}%`, transform: 'translateX(-50%)' }}
              />
              
              {/* Filled area up to position */}
              <div
                className={`h-full ${color} opacity-30 transition-all`}
                style={{ width: `${Math.min(100, Math.max(0, position))}%` }}
              />
            </div>

            {/* Labels */}
            {showLabels && (
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{formatCurrency(minimum)}</span>
                <span>{formatCurrency(maximum)}</span>
              </div>
            )}

            {/* Percentage */}
            <div className="text-xs text-muted-foreground">
              {Math.round(position)}% da faixa
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-sm">
            <div className="font-medium">{getStatusLabel()}</div>
            <div className="text-muted-foreground">
              Atual: {formatCurrency(currentSalary)}
            </div>
            <div className="text-muted-foreground text-xs">
              Faixa: {formatCurrency(minimum)} - {formatCurrency(maximum)}
            </div>
            <div className="text-muted-foreground text-xs">
              Ponto médio: {formatCurrency(midpoint)}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
