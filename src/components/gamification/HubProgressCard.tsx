import { cn } from "@/lib/utils";
import { ProgressRing } from "./ProgressRing";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";

interface HubProgressCardProps {
  journeyId: string;
  className?: string;
  showStepsCount?: boolean;
}

export function HubProgressCard({
  journeyId,
  className,
  showStepsCount = true,
}: HubProgressCardProps) {
  const { journeys, isLoading } = useJourneyProgress();

  const journey = journeys.find((j) => j.id === journeyId);

  if (isLoading || !journey) {
    return (
      <div className={cn("flex flex-col items-center gap-2", className)}>
        <ProgressRing progress={0} size={100} gradient showPercentage={false}>
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-foreground">0%</span>
            <span className="text-xs text-muted-foreground">Progresso</span>
          </div>
        </ProgressRing>
        {showStepsCount && (
          <span className="text-sm text-muted-foreground">
            0 de 0 etapas
          </span>
        )}
      </div>
    );
  }

  const completedSteps = journey.steps.filter(
    (s) => s.status === "completed"
  ).length;
  const totalSteps = journey.steps.length;
  const progressPercentage =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <ProgressRing
        progress={progressPercentage}
        size={100}
        strokeWidth={8}
        gradient
        showPercentage={false}
      >
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-foreground">
            {progressPercentage}%
          </span>
          <span className="text-xs text-muted-foreground">Progresso</span>
        </div>
      </ProgressRing>
      {showStepsCount && (
        <span className="text-sm text-muted-foreground">
          {completedSteps} de {totalSteps} etapas
        </span>
      )}
    </div>
  );
}
