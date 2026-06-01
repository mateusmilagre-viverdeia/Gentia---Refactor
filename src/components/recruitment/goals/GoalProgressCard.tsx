import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown, Clock, AlertTriangle } from "lucide-react";
import { GoalProgress } from "@/hooks/useRecruitmentGoals";
import { GoalProgressBar } from "./GoalProgressBar";
import { parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { formatBRT } from "@/lib/datetime";

interface GoalProgressCardProps {
  goalProgress: GoalProgress;
}

export function GoalProgressCard({ goalProgress }: GoalProgressCardProps) {
  const { goal, progress, daysRemaining, expectedProgress, overallProgress, overallStatus } = goalProgress;

  const statusConfig = {
    ahead: {
      label: "Acima do Esperado",
      icon: TrendingUp,
      color: "bg-green-500/10 text-green-600 border-green-500/20",
      ringColor: "stroke-green-500",
    },
    on_track: {
      label: "No Ritmo",
      icon: Target,
      color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      ringColor: "stroke-blue-500",
    },
    behind: {
      label: "Atrasado",
      icon: TrendingDown,
      color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      ringColor: "stroke-yellow-500",
    },
    critical: {
      label: "Crítico",
      icon: AlertTriangle,
      color: "bg-red-500/10 text-red-600 border-red-500/20",
      ringColor: "stroke-red-500",
    },
  };

  const config = statusConfig[overallStatus];
  const StatusIcon = config.icon;

  const periodLabel = () => {
    const start = parseISO(goal.period_start);
    switch (goal.period_type) {
      case 'monthly':
        return formatBRT(start, "MMMM yyyy");
      case 'quarterly':
        const quarter = Math.ceil((start.getMonth() + 1) / 3);
        return `${quarter}º Trimestre ${start.getFullYear()}`;
      case 'yearly':
        return `Ano ${start.getFullYear()}`;
      default:
        return formatBRT(start, "dd/MM/yyyy");
    }
  };

  // Calculate circumference for the circular progress
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (overallProgress / 100) * circumference;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg capitalize">{periodLabel()}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {daysRemaining} dias restantes
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Circular Progress and Status */}
        <div className="flex items-center gap-6">
          {/* Circular Progress Gauge */}
          <div className="relative flex-shrink-0">
            <svg className="w-28 h-28 -rotate-90">
              {/* Background circle */}
              <circle
                cx="56"
                cy="56"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted"
              />
              {/* Progress circle */}
              <circle
                cx="56"
                cy="56"
                r={radius}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={progressOffset}
                className={cn("transition-all duration-500", config.ringColor)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{Math.round(overallProgress)}%</span>
              <span className="text-xs text-muted-foreground">progresso</span>
            </div>
          </div>

          {/* Status Info */}
          <div className="flex-1 space-y-2">
            <Badge className={cn("gap-1.5", config.color)}>
              <StatusIcon className="h-3.5 w-3.5" />
              {config.label}
            </Badge>
            <p className="text-sm text-muted-foreground">
              Esperado até agora: <span className="font-medium text-foreground">{expectedProgress.toFixed(0)}%</span>
            </p>
            {overallStatus === 'behind' || overallStatus === 'critical' ? (
              <p className="text-sm text-yellow-600">
                Desvio de {Math.abs(overallProgress - expectedProgress).toFixed(0)}% em relação ao esperado
              </p>
            ) : null}
          </div>
        </div>

        {/* Individual Metrics Progress */}
        <div className="space-y-4 pt-2 border-t">
          {goal.goal_hires && (
            <GoalProgressBar
              label="Contratações"
              current={progress.hires.current}
              target={progress.hires.target}
              percentage={progress.hires.percentage}
              expectedProgress={expectedProgress}
            />
          )}
          
          {goal.goal_applications && (
            <GoalProgressBar
              label="Candidaturas"
              current={progress.applications.current}
              target={progress.applications.target}
              percentage={progress.applications.percentage}
              expectedProgress={expectedProgress}
            />
          )}
          
          {goal.goal_time_to_hire && (
            <GoalProgressBar
              label="Tempo Médio"
              current={progress.timeToHire.current}
              target={progress.timeToHire.target}
              percentage={progress.timeToHire.percentage}
              expectedProgress={expectedProgress}
              unit="dias"
              isInverse={true}
              showExpectedMarker={false}
            />
          )}
          
          {goal.goal_conversion_rate && (
            <GoalProgressBar
              label="Taxa de Conversão"
              current={progress.conversionRate.current}
              target={progress.conversionRate.target}
              percentage={progress.conversionRate.percentage}
              expectedProgress={expectedProgress}
              unit="%"
            />
          )}
          
          {goal.goal_fill_rate && (
            <GoalProgressBar
              label="Taxa de Preenchimento"
              current={progress.fillRate.current}
              target={progress.fillRate.target}
              percentage={progress.fillRate.percentage}
              expectedProgress={expectedProgress}
              unit="%"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
