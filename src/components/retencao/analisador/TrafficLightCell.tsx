import { cn } from "@/lib/utils";
import { getScoreTrafficLight, type TrafficLightColor } from "@/types/people-analysis.types";

interface TrafficLightCellProps {
  score: number | null;
  onChange: (score: number) => void;
}

const lightStyles: Record<TrafficLightColor, string> = {
  red: "bg-red-500 hover:bg-red-600",
  yellow: "bg-yellow-500 hover:bg-yellow-600",
  green: "bg-green-500 hover:bg-green-600",
};

const inactiveStyles: Record<TrafficLightColor, string> = {
  red: "bg-red-200 hover:bg-red-300",
  yellow: "bg-yellow-200 hover:bg-yellow-300",
  green: "bg-green-200 hover:bg-green-300",
};

export function TrafficLightCell({ score, onChange }: TrafficLightCellProps) {
  const lights: { color: TrafficLightColor; value: number }[] = [
    { color: 'red', value: 0 },
    { color: 'yellow', value: 0.5 },
    { color: 'green', value: 1 },
  ];

  const activeColor = score !== null ? getScoreTrafficLight(score) : null;

  return (
    <div className="flex items-center justify-center gap-1">
      {lights.map(({ color, value }) => {
        const isActive = score === value;
        return (
          <button
            key={color}
            onClick={() => onChange(value)}
            className={cn(
              "w-5 h-5 rounded-full transition-all",
              isActive ? lightStyles[color] : inactiveStyles[color],
              isActive && "ring-2 ring-offset-1 ring-foreground/20"
            )}
            title={
              color === 'red' 
                ? 'Não exibe (0 pts)' 
                : color === 'yellow' 
                  ? 'Às vezes (0.5 pts)' 
                  : 'Exibe (1 pt)'
            }
          />
        );
      })}
    </div>
  );
}
