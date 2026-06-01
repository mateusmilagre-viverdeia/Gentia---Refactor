import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface HealthScoreBadgeProps {
  status: "green" | "yellow" | "red";
  score?: number;
  showScore?: boolean;
  className?: string;
}

const STATUS_LABEL = {
  green: "Saudável",
  yellow: "Atenção",
  red: "Risco",
};

export function HealthScoreBadge({
  status,
  score,
  showScore = true,
  className,
}: HealthScoreBadgeProps) {
  const styles = {
    green: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
    yellow: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400",
    red: "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400",
  } as const;

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", styles[status], className)}
    >
      <span
        className={cn(
          "mr-1.5 inline-block h-2 w-2 rounded-full",
          status === "green" && "bg-emerald-500",
          status === "yellow" && "bg-amber-500",
          status === "red" && "bg-red-500",
        )}
      />
      {STATUS_LABEL[status]}
      {showScore && typeof score === "number" && (
        <span className="ml-1.5 opacity-70">{score}</span>
      )}
    </Badge>
  );
}
