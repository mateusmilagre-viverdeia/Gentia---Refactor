import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Clock, MoreHorizontal } from "lucide-react";
import { RecruitmentGoal } from "@/hooks/useRecruitmentGoals";
import { parseISO, isPast } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBRT } from "@/lib/datetime";

interface GoalHistoryListProps {
  goals: RecruitmentGoal[];
  isLoading?: boolean;
  onCancel?: (goalId: string) => void;
}

export function GoalHistoryList({ goals, isLoading, onCancel }: GoalHistoryListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Metas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const pastGoals = goals.filter(g => 
    g.status !== 'active' || isPast(parseISO(g.period_end))
  );

  if (pastGoals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Metas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma meta anterior encontrada
          </p>
        </CardContent>
      </Card>
    );
  }

  const getPeriodLabel = (goal: RecruitmentGoal) => {
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

  const getStatusConfig = (goal: RecruitmentGoal) => {
    if (goal.status === 'cancelled') {
      return {
        icon: XCircle,
        label: "Cancelada",
        color: "text-muted-foreground",
        bgColor: "bg-muted",
      };
    }
    if (goal.status === 'completed') {
      return {
        icon: CheckCircle,
        label: "Concluída",
        color: "text-green-600",
        bgColor: "bg-green-500/10",
      };
    }
    // Active but past end date
    return {
      icon: Clock,
      label: "Encerrada",
      color: "text-yellow-600",
      bgColor: "bg-yellow-500/10",
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Histórico de Metas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {pastGoals.map((goal) => {
          const config = getStatusConfig(goal);
          const StatusIcon = config.icon;

          return (
            <div
              key={goal.id}
              className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className={`p-2 rounded-full ${config.bgColor}`}>
                <StatusIcon className={`h-4 w-4 ${config.color}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium capitalize">{getPeriodLabel(goal)}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {goal.goal_hires && <span>{goal.goal_hires} contratações</span>}
                  {goal.goal_applications && <span>• {goal.goal_applications} candidaturas</span>}
                </div>
              </div>

              <Badge variant="outline" className={config.color}>
                {config.label}
              </Badge>

              {goal.status === 'active' && onCancel && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onCancel(goal.id)}>
                      Cancelar Meta
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
