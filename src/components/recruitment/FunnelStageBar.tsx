import { cn } from "@/lib/utils";
import { ArrowDown } from "lucide-react";

interface FunnelStageBarProps {
  name: string;
  count: number;
  percentage: number;
  conversionRate: number | null;
  color: string;
  isFirst: boolean;
  isLast: boolean;
}

export function FunnelStageBar({
  name,
  count,
  percentage,
  conversionRate,
  color,
  isFirst,
  isLast,
}: FunnelStageBarProps) {
  const minWidth = 20; // minimum width percentage
  const barWidth = Math.max(percentage, minWidth);

  return (
    <div className="flex flex-col items-center">
      {/* Conversion rate arrow */}
      {!isFirst && conversionRate !== null && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <ArrowDown className="h-3 w-3" />
          <span className={cn(
            "font-medium",
            conversionRate >= 70 ? "text-green-600" :
            conversionRate >= 40 ? "text-amber-600" :
            "text-red-600"
          )}>
            {conversionRate}%
          </span>
        </div>
      )}

      {/* Stage bar container */}
      <div className="w-full flex justify-center">
        <div
          className={cn(
            "relative h-12 rounded-lg flex items-center justify-between px-4 transition-all duration-300",
            "shadow-sm hover:shadow-md cursor-default"
          )}
          style={{
            width: `${barWidth}%`,
            background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          }}
        >
          {/* Stage name */}
          <span className="text-white font-medium text-sm truncate">
            {name}
          </span>

          {/* Count badge */}
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white px-2 py-0.5 rounded text-sm font-semibold">
              {count}
            </span>
            <span className="text-white/80 text-xs">
              {percentage}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
