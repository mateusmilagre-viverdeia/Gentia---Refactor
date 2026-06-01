import { useState } from "react";
import { Coins, Plus, AlertTriangle } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { PurchaseCreditsModal } from "@/components/recruitment/credits";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function TopbarCreditsIndicator() {
  const { balance, isLoading } = useCredits();
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  if (isLoading) return null;

  const isEmpty = balance === 0;
  const isLow = balance > 0 && balance < 10;

  const tooltipText = isEmpty
    ? "Créditos esgotados — clique para recarregar"
    : isLow
      ? "Créditos baixos — clique para recarregar"
      : "Comprar mais créditos";

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all",
              isEmpty
                ? "bg-destructive/10 hover:bg-destructive/20"
                : isLow
                  ? "bg-amber-500/10 hover:bg-amber-500/20 animate-pulse"
                  : "bg-amber-500/10 hover:bg-amber-500/20"
            )}
            onClick={() => setPurchaseOpen(true)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {isEmpty ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <Coins className={cn(
                "h-4 w-4",
                isLow ? "text-amber-500" : "text-amber-500"
              )} />
            )}
            <span className={cn(
              "text-sm font-bold",
              isEmpty
                ? "text-destructive"
                : isLow
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-amber-600 dark:text-amber-400"
            )}>
              {Number(balance).toFixed(1)}
            </span>
            {isHovered && (
              <Plus className={cn(
                "h-3.5 w-3.5",
                isEmpty ? "text-destructive" : "text-amber-500"
              )} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>

      <PurchaseCreditsModal
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
      />
    </>
  );
}
