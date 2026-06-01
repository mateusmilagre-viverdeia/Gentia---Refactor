import { cn } from "@/lib/utils";
import { getTotalTrafficLight, type TrafficLightColor } from "@/types/people-analysis.types";

interface TotalCellProps {
  total: number;
  maxPossible: number;
}

const lightStyles: Record<TrafficLightColor, string> = {
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
};

const textStyles: Record<TrafficLightColor, string> = {
  red: "text-red-700",
  yellow: "text-yellow-700",
  green: "text-green-700",
};

export function TotalCell({ total, maxPossible }: TotalCellProps) {
  const color = getTotalTrafficLight(total);
  
  return (
    <div className="flex items-center justify-center gap-2">
      <span className={cn("font-semibold", textStyles[color])}>
        {total.toFixed(1)}
      </span>
      <div className={cn("w-4 h-4 rounded-full", lightStyles[color])} />
    </div>
  );
}
