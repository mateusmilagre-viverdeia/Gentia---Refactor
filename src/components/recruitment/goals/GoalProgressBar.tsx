import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GoalProgressBarProps {
  current: number;
  target: number;
  percentage: number;
  expectedProgress: number;
  label: string;
  unit?: string;
  isInverse?: boolean;
  showExpectedMarker?: boolean;
}

export function GoalProgressBar({
  current,
  target,
  percentage,
  expectedProgress,
  label,
  unit = "",
  isInverse = false,
  showExpectedMarker = true,
}: GoalProgressBarProps) {
  if (target === 0) return null;

  const getProgressColor = () => {
    if (isInverse) {
      return current <= target ? "bg-green-500" : "bg-red-500";
    }
    if (percentage >= expectedProgress) return "bg-green-500";
    if (percentage >= expectedProgress - 10) return "bg-yellow-500";
    return "bg-red-500";
  };

  const formatValue = (value: number) => {
    if (unit === "%") return `${value.toFixed(1)}%`;
    if (unit === "dias") return `${Math.round(value)} dias`;
    return Math.round(value).toString();
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {formatValue(current)} / {formatValue(target)}
          <span className="text-muted-foreground ml-1">
            ({percentage.toFixed(0)}%)
          </span>
        </span>
      </div>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
              {/* Progress bar */}
              <div
                className={cn(
                  "absolute top-0 left-0 h-full rounded-full transition-all duration-500",
                  getProgressColor()
                )}
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
              
              {/* Expected progress marker */}
              {showExpectedMarker && !isInverse && (
                <div
                  className="absolute top-0 h-full w-0.5 bg-foreground/50"
                  style={{ left: `${Math.min(100, expectedProgress)}%` }}
                />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Progresso atual: {percentage.toFixed(1)}%</p>
            {!isInverse && <p>Esperado: {expectedProgress.toFixed(1)}%</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
