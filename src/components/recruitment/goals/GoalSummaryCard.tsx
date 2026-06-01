import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, TrendingUp, TrendingDown, AlertTriangle, ArrowRight, Plus } from "lucide-react";
import { GoalProgress } from "@/hooks/useRecruitmentGoals";
import { parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { formatBRT } from "@/lib/datetime";

interface GoalSummaryCardProps {
  goalProgress: GoalProgress | null | undefined;
  isLoading?: boolean;
}

export function GoalSummaryCard({ goalProgress, isLoading }: GoalSummaryCardProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!goalProgress) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-full">
                <Target className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Nenhuma meta ativa</p>
                <p className="text-sm text-muted-foreground">
                  Defina metas para acompanhar o progresso do recrutamento
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/atracao-contratacao/recrutamento/metas')}
            >
              <Plus className="h-4 w-4 mr-1" />
              Criar Meta
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { goal, progress, daysRemaining, expectedProgress, overallProgress, overallStatus } = goalProgress;

  const statusConfig = {
    ahead: {
      label: "Acima",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-500",
    },
    on_track: {
      label: "No Ritmo",
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-500",
    },
    behind: {
      label: "Atrasado",
      icon: TrendingDown,
      color: "text-yellow-600",
      bgColor: "bg-yellow-500",
    },
    critical: {
      label: "Crítico",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-500",
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
        return `${quarter}º Tri ${start.getFullYear()}`;
      case 'yearly':
        return start.getFullYear().toString();
      default:
        return formatBRT(start, "MMM yyyy");
    }
  };

  const activeMetrics = [
    goal.goal_hires && `${progress.hires.current}/${progress.hires.target} contratações`,
    goal.goal_applications && `${progress.applications.current}/${progress.applications.target} candidaturas`,
  ].filter(Boolean);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Progress Circle */}
          <div className="relative flex-shrink-0">
            <svg className="w-12 h-12 -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-muted"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 20}
                strokeDashoffset={2 * Math.PI * 20 * (1 - overallProgress / 100)}
                className={cn("transition-all duration-500", config.bgColor.replace('bg-', 'stroke-'))}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold">{Math.round(overallProgress)}%</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium capitalize">{periodLabel()}</span>
              <Badge variant="outline" className={cn("gap-1 text-xs", config.color)}>
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-1.5 bg-muted rounded-full mb-1">
              <div
                className={cn("absolute top-0 left-0 h-full rounded-full transition-all", config.bgColor)}
                style={{ width: `${Math.min(100, overallProgress)}%` }}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-foreground/40"
                style={{ left: `${Math.min(100, expectedProgress)}%` }}
              />
            </div>
            
            <p className="text-xs text-muted-foreground truncate">
              {activeMetrics.join(" • ")} • {daysRemaining}d restantes
            </p>
          </div>

          {/* Action */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/atracao-contratacao/recrutamento/metas')}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
