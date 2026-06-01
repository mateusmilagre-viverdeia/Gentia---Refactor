import { Link } from "react-router-dom";
import { Trophy, ChevronRight, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { StepProgressIndicator } from "./StepProgressIndicator";
import { Skeleton } from "@/components/ui/skeleton";

interface PageGamificationBannerProps {
  journeyId: string;
  stepId: string;
  compact?: boolean;
}

const JOURNEY_COLORS: Record<string, string> = {
  diagnostico: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
  cultura: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
  atracao: 'from-green-500/10 to-green-600/5 border-green-500/20',
  retencao: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
};

const JOURNEY_TEXT_COLORS: Record<string, string> = {
  diagnostico: 'text-purple-600 dark:text-purple-400',
  cultura: 'text-amber-600 dark:text-amber-400',
  atracao: 'text-green-600 dark:text-green-400',
  retencao: 'text-blue-600 dark:text-blue-400',
};

export function PageGamificationBanner({ 
  journeyId, 
  stepId, 
  compact = false 
}: PageGamificationBannerProps) {
  const { journeys, isLoading, getJourneyById } = useJourneyProgress();

  if (isLoading) {
    return (
      <div className="mb-6">
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  const journey = getJourneyById(journeyId);
  if (!journey) return null;

  const step = journey.steps.find(s => s.id === stepId);
  if (!step) return null;

  const currentStepIndex = journey.steps.findIndex(s => s.id === stepId);
  const journeyProgress = journey.totalSteps > 0 
    ? Math.round((journey.completedSteps / journey.totalSteps) * 100) 
    : 0;

  const gradientClass = JOURNEY_COLORS[journeyId] || JOURNEY_COLORS.cultura;
  const textColorClass = JOURNEY_TEXT_COLORS[journeyId] || JOURNEY_TEXT_COLORS.cultura;

  if (compact) {
    return (
      <div className={`mb-4 p-3 rounded-lg bg-gradient-to-r ${gradientClass} border`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className={`h-4 w-4 ${textColorClass}`} />
            <span className="text-sm font-medium">{journey.title}</span>
            <span className="text-muted-foreground">•</span>
            <StepProgressIndicator
              title={step.title}
              progress={step.progress_percentage}
              points={step.points}
              status={step.status}
              compact
            />
          </div>
          <Button variant="ghost" size="sm" asChild className="h-7 px-2">
            <Link to="/jornadas" className="flex items-center gap-1 text-xs">
              Ver Jornada
              <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-6 p-4 rounded-lg bg-gradient-to-r ${gradientClass} border`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left side - Journey info */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className={`h-5 w-5 ${textColorClass}`} />
            <span className={`font-semibold ${textColorClass}`}>{journey.title}</span>
            <Badge variant="outline" className="text-xs">
              Etapa {currentStepIndex + 1} de {journey.totalSteps}
            </Badge>
          </div>
          
          {/* Journey progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso da jornada</span>
              <span>{journeyProgress}%</span>
            </div>
            <Progress value={journeyProgress} className="h-2" />
          </div>

          {/* Current step info */}
          <div className="pt-1">
            <StepProgressIndicator
              title={step.title}
              progress={step.progress_percentage}
              points={step.points}
              status={step.status}
            />
          </div>
        </div>

        {/* Right side - CTA */}
        <div className="flex flex-col items-end gap-2">
          {step.status !== 'completed' && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>+{step.points} pts ao completar</span>
            </div>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to="/jornadas" className="flex items-center gap-1">
              Ver Jornada Completa
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
