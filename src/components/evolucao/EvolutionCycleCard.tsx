import { differenceInDays, parseISO } from "date-fns";
import { 
  Calendar, 
  User, 
  Target, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Briefcase
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { EvolutionCycle, EvolutionCycleStatus } from "@/types/evolution.types";
import { formatBRT } from "@/lib/datetime";

interface EvolutionCycleCardProps {
  cycle: EvolutionCycle;
  onClick: () => void;
}

const statusConfig: Record<EvolutionCycleStatus, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: typeof CheckCircle2;
}> = {
  draft: { label: "Rascunho", variant: "outline", icon: Clock },
  active: { label: "Ativo", variant: "default", icon: Target },
  completed: { label: "Concluído", variant: "secondary", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", variant: "destructive", icon: AlertCircle },
};

// Helper to get full name from profile
function getFullName(profile?: { first_name: string; last_name: string } | null): string {
  if (!profile) return "Não definido";
  return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Sem nome";
}

export function EvolutionCycleCard({ cycle, onClick }: EvolutionCycleCardProps) {
  const status = statusConfig[cycle.status];
  const StatusIcon = status.icon;

  const collaboratorName = getFullName(cycle.collaborator);
  const leaderName = cycle.leader ? getFullName(cycle.leader) : null;

  // Calculate progress
  const totalActions = cycle.objectives?.reduce(
    (acc, obj) => acc + (obj.actions?.length || 0),
    0
  ) || 0;
  const completedActions = cycle.objectives?.reduce(
    (acc, obj) =>
      acc + (obj.actions?.filter((a) => a.status === "completed").length || 0),
    0
  ) || 0;
  const progress = totalActions > 0 ? (completedActions / totalActions) * 100 : 0;

  // Calculate days remaining
  const endDate = parseISO(cycle.end_date);
  const today = new Date();
  const daysRemaining = differenceInDays(endDate, today);

  // Get priority competency
  const priorityCompetency = cycle.competencies?.find((c) => c.is_priority);

  return (
    <Card
      className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/50 overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                  {collaboratorName}
                </h3>
                {leaderName && (
                  <p className="text-sm text-muted-foreground">
                    Líder: {leaderName}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={status.variant} className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>

          {/* Competency */}
          {priorityCompetency && (
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Foco:</span>
              <span className="font-medium truncate">
                {priorityCompetency.competency_name}
              </span>
            </div>
          )}

          {/* Job Description */}
          {cycle.job_description && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground truncate">
                {cycle.job_description.title}
              </span>
            </div>
          )}

          {/* Progress */}
          {cycle.status === "active" && totalActions > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">
                  {completedActions}/{totalActions} ações
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {formatBRT(parseISO(cycle.start_date), "dd MMM")} -{" "}
                {formatBRT(endDate, "dd MMM yyyy")}
              </span>
            </div>

            {cycle.status === "active" && (
              <div
                className={`text-sm font-medium ${
                  daysRemaining < 7
                    ? "text-destructive"
                    : daysRemaining < 30
                    ? "text-yellow-600"
                    : "text-muted-foreground"
                }`}
              >
                {daysRemaining > 0
                  ? `${daysRemaining} dias restantes`
                  : daysRemaining === 0
                  ? "Último dia!"
                  : `${Math.abs(daysRemaining)} dias atrasado`}
              </div>
            )}

            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
